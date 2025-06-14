import express from 'express';
import BlogPost from '../models/BlogPost.js';
import Blog from '../models/Blog.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// =================
// POST ROUTES
// =================

// Get all published posts
router.get('/', async (req, res) => {
  try {
    const { tag, limit = 10, page = 1, featured } = req.query;
    const query = { published: true };
    
    if (tag) query.tags = tag;
    if (featured === 'true') query.featured = true;
    
    const posts = await BlogPost.find(query)
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await BlogPost.countDocuments(query);
    
    res.json({ 
      posts, 
      totalPosts: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single post by ID (needed for edit functionality)
router.get('/post/:id', async (req, res) => {
  try {
    console.log(`Fetching post by ID: ${req.params.id}`);
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ message: 'Invalid post ID format' });
    }
    
    const post = await BlogPost.findById(req.params.id)
      .populate('author', 'username');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post by ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get a single post by slug
router.get('/:slug', async (req, res) => {
  try {
    const post = await BlogPost.findOne({ 
      slug: req.params.slug,
      published: true 
    }).populate('author', 'username');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Increment view count
    post.viewCount += 1;
    await post.save();
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ADMIN ROUTES

// Get all posts (including unpublished) - Admin only
router.get('/admin/all', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    const posts = await BlogPost.find()
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await BlogPost.countDocuments();
    
    res.json({ 
      posts, 
      totalPosts: total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create a new post - Admin only
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content, excerpt, tags, coverImage, published, featured } = req.body;
    
    const post = new BlogPost({
      title,
      content,
      excerpt,
      tags: tags || [],
      author: req.session.user.id,
      coverImage,
      published: published !== undefined ? published : true,
      featured: featured || false
    });
    
    await post.save();
    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update a post - Admin only
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { title, content, excerpt, tags, coverImage, published, featured } = req.body;
    
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // This line updates the coverImage field in the database
    post.coverImage = coverImage || post.coverImage;
    
    // Other fields being updated...
    post.title = title || post.title;
    post.content = content || post.content;
    post.excerpt = excerpt || post.excerpt;
    post.tags = tags || post.tags;
    post.published = published !== undefined ? published : post.published;
    post.featured = featured !== undefined ? featured : post.featured;
    
    // Save the updated post to the database
    await post.save();
    res.json({ message: 'Post updated successfully', post });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a post - Admin only
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const post = await BlogPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// =================
// BLOG ROUTES
// =================

// Get all blogs
router.get('/blogs', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .populate('author', 'username');
    
    res.status(200).json(blogs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single blog by ID
router.get('/blogs/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.status(200).json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new blog (protected)
router.post('/blogs', isAuthenticated, async (req, res) => {
  try {
    const { title, content, summary, tags, coverImage } = req.body;
    
    const newBlog = new Blog({
      title,
      content,
      summary,
      tags: tags || [],
      coverImage: coverImage || '',
      author: req.user.id
    });
    
    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update blog (protected)
router.put('/blogs/:id', isAuthenticated, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Check if user is the author
    if (blog.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    
    res.status(200).json(updatedBlog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete blog (protected)
router.delete('/blogs/:id', isAuthenticated, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    // Check if user is the author
    if (blog.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    await Blog.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;