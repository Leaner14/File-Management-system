import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import dotenv from 'dotenv';
import pool from './db.js';
// Removed, using exported from minio.js
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { minioClient, bucketName } from './minio.js';  // Use exported

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT) || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Move to startup()


// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads')),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Startup sequence
async function startup() {
  console.log('Backend starting...');
  
  // Ensure uploads dir
  await fs.mkdir(path.join(__dirname, 'uploads'), { recursive: true }).catch(console.error);
  
  // Test DB
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ DB connected');
    
    // Test metadata table
    const res = await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_name = 'metadata'");
    if (parseInt(res.rows[0].count) === 0) {
      throw new Error('metadata table missing');
    }
    console.log('✅ Metadata table OK');
  } catch (err) {
    console.error('❌ DB error:', err.message);
    process.exit(1);
  }
  
  // Test MinIO bucket
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log('✅ Bucket created:', bucketName);
    } else {
      console.log('✅ Bucket exists:', bucketName);
    }
  } catch (err) {
    console.error('❌ MinIO error:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Startup complete');
}

// Routes
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    await minioClient.bucketExists(bucketName);
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });

    const filePath = `uploads/${req.file.filename}`;
    
    await minioClient.fPutObject(bucketName, filePath, req.file.path);
    
    // Cleanup temp file
    await fs.unlink(req.file.path);
    
    res.json({ 
      filePath: filePath,
      title: req.file.originalname
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/get-file/:filePath*', async (req, res) => {
  try {
    const filePath = req.params.filePath;
    if (!filePath || filePath.includes('..')) return res.status(400).json({ error: 'Invalid path' });

    const stat = await minioClient.statObject(bucketName, filePath);
    const stream = await minioClient.getObject(bucketName, filePath);

    res.set('Content-Type', stat.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    res.set('Content-Length', stat.size.toString());

    stream.pipe(res);
  } catch (error) {
    console.error('Get file error:', error);
    if (error.code === 'NoSuchKey') {
      return res.status(404).json({ error: 'File not found' });
    }
    res.status(500).json({ error: 'Download failed' });
  }
});



app.post('/metadata', async (req, res) => {
  try {
    const { title, description, filePath } = req.body;
    const result = await pool.query(
      'INSERT INTO metadata (title, description, filePath) VALUES ($1, $2, $3) RETURNING *',
      [title, description, filePath]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Metadata POST:', error);
    res.status(500).json({ error: 'Save failed' });
  }
});

app.get('/files', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM metadata ORDER BY createdAt DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Files GET:', error);
    res.status(500).json({ error: 'Fetch failed' });
  }
});

app.delete('/file/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Get file info
    const fileRes = await pool.query('SELECT filePath FROM metadata WHERE id = $1', [id]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = fileRes.rows[0].filePath;
    
    // Delete from MinIO
    await minioClient.removeObject(bucketName, filePath);
    
    // Delete from DB
    await pool.query('DELETE FROM metadata WHERE id = $1', [id]);
    
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await pool.end();
  process.exit(0);
});

// Run startup then listen
startup().then(() => {
  app.listen(port, () => {
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  });
}).catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});

console.log('Backend deps OK:', { pg: !!pool, minio: !!minioClient });

