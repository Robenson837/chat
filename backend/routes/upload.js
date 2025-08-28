import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import User from '../models/User.js';

const router = express.Router();

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/avatars', 'uploads/attachments'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// Configure multer for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.user._id}_${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for avatars
    files: 1
  }
});

// Configure multer for attachments
const attachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.user._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, filename);
  }
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Max 5 files per request
  }
});

// Upload avatar
router.post('/avatar', (req, res, next) => {
  avatarUpload.single('avatar')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'Avatar file too large (max 5MB)' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Only one avatar file allowed' });
        }
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file uploaded' });
    }

    try {
      // Delete old avatar if exists
      const user = await User.findById(req.user._id);
      if (user.avatarPath) {
        const oldAvatarPath = path.join(process.cwd(), user.avatarPath);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Update user avatar path
      const avatarPath = `/uploads/avatars/${req.file.filename}`;
      await User.findByIdAndUpdate(req.user._id, { avatarPath });

      res.json({
        message: 'Avatar uploaded successfully',
        avatarPath,
        file: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });

    } catch (error) {
      // Clean up uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(error);
    }
  });
});

// Upload attachments
router.post('/attachments', (req, res, next) => {
  attachmentUpload.array('attachments')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({ error: 'Too many files (max 5)' });
        }
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    try {
      const attachments = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        filePath: `/uploads/attachments/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      }));

      res.json({
        message: 'Attachments uploaded successfully',
        attachments,
        count: attachments.length
      });

    } catch (error) {
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      next(error);
    }
  });
});

// Get file info
router.get('/info/:type/:filename', async (req, res, next) => {
  try {
    const { type, filename } = req.params;
    
    if (!['avatars', 'attachments'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(process.cwd(), 'uploads', type, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = fs.statSync(filePath);
    
    res.json({
      filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      type,
      path: `/uploads/${type}/${filename}`
    });

  } catch (error) {
    next(error);
  }
});

// Delete uploaded file
router.delete('/:type/:filename', async (req, res, next) => {
  try {
    const { type, filename } = req.params;
    
    if (!['avatars', 'attachments'].includes(type)) {
      return res.status(400).json({ error: 'Invalid file type' });
    }

    const filePath = path.join(process.cwd(), 'uploads', type, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file (filename should start with user ID)
    if (!filename.startsWith(req.user._id.toString())) {
      return res.status(403).json({ error: 'Cannot delete file that does not belong to you' });
    }

    fs.unlinkSync(filePath);

    // If it was an avatar, update user record
    if (type === 'avatars') {
      const avatarPath = `/uploads/avatars/${filename}`;
      const user = await User.findById(req.user._id);
      if (user.avatarPath === avatarPath) {
        await User.findByIdAndUpdate(req.user._id, { avatarPath: null });
      }
    }

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    next(error);
  }
});

// Get upload limits and allowed types
router.get('/config', (req, res) => {
  res.json({
    limits: {
      avatar: {
        maxSize: 5 * 1024 * 1024, // 5MB
        maxFiles: 1
      },
      attachments: {
        maxSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
        maxFiles: 5
      }
    },
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
      video: ['video/mp4', 'video/webm'],
      documents: [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    }
  });
});

export default router;