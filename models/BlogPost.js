import mongoose from 'mongoose';
import slugify from 'slugify';

const blogPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverImage: {
    type: String,
    default: ''
  },
  tags: [String],
  readTime: {
    type: String,
    default: '5 min read'
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  published: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Generate slug before saving
blogPostSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { 
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });
    
    // Add a timestamp to make slug unique if needed
    if (!this.slug) {
      const timestamp = (new Date()).getTime().toString(36);
      this.slug = `post-${timestamp}`;
    }
  }
  
  // Set published flag based on status
  if (this.isModified('status')) {
    this.published = this.status === 'published';
  }
  
  next();
});

// Add a method to get the correct image URL
blogPostSchema.methods.getImageUrl = function() {
  if (!this.coverImage) return null;
  
  // Always ensure the coverImage starts with /uploads/ for consistency
  if (this.coverImage.startsWith('/uploads/')) {
    return this.coverImage;
  }
  
  // If it's just a filename, add /uploads/ prefix
  if (!this.coverImage.includes('/')) {
    return `/uploads/${this.coverImage}`;
  }
  
  return this.coverImage;
};

const BlogPost = mongoose.model('BlogPost', blogPostSchema);

export default BlogPost;