const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  company: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  img: {
    type: String,
    required: true
  },
  sale: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  sold: {
    type: Number,
    //required: true
    default: 0
  },
  state: {
    type: Boolean,
    required: true
  },
  published: {
    type: Date,
    required: true
  },
  post: {
    // company: {
    //   type: String,
    //   required: true
    // },
    guarantee: {
      type: String,
      required: true
    },
    img: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    info: {
      type: String
    },
    led: {
      type: String
    },
    switch: {
      type: String
    }
  }
});

const Productions = mongoose.model('Productions', productSchema);
module.exports = Productions;