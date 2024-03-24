import express from 'express';
import env from 'dotenv';
import cors from 'cors';
import connectDB from './db.js';
import compModel from './schema.js'; 
import cloudinary from 'cloudinary'; 
import multer from 'multer';
import streamifier from 'streamifier';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const PORT = 5000;
env.config();

const app = express();

app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});




let addCount = 0; // Counter for the 'add' API
let updateCount = 0; // Counter for the 'update' API

// Middleware to increment the counts for 'add' and 'update' APIs
app.use((req, res, next) => {
  if (req.originalUrl === '/upload' && req.method === 'POST') {
    addCount++;
  } else if (req.originalUrl.startsWith('/update/') && req.method === 'PUT') {
    updateCount++;
  }
  next();
});




const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'task',
    resource_type: 'auto' ,
    //allowed_formats: ['jpg', 'jpeg', 'png']
  }
});



const uploads = multer();

app.post('/upload', uploads.single('image'), async (req, res) => {
  try {

    const { component, text } = req.body;
    let imageData;
    console.log({ component, text });

     imageData = await cloudinaryPost(req);
     console.log({imageData});

     const newData = new compModel({
      component,
      text,
      image: imageData || null,
      createdAt: new Date(),
      updatedAt: null,
    });
    newData.save();
    res.status(200).json({ success: true, data: newData });


  } catch (error) {
    res.status(200).json({ success: false , error });
  }
});



app.get('/recentComponents', async (req, res) => {
  try {
    // Define the pipeline to aggregate the data
    const pipeline = [
      // Match documents where component is 1, 2, or 3
      { $match: { component: { $in: [1, 2] } } },
      // Sort documents by dateTime in descending order
      { $sort: { createdAt: -1 } },
      // Group documents by component and push each document into an array
      {
        $group: {
          _id: '$component',
          recentDocuments: { $push: '$$ROOT' }
        }
      },
      // Sort documents by component in ascending order
      { $sort: { _id: 1 } },
      // Replace the _id field with the component field
      { $replaceRoot: { newRoot: { $arrayElemAt: ['$recentDocuments', 0] } } },
      // Project only the required fields including _id and updatedAt
      {
        $project: {
          _id: 1,
          component: 1,
          text: 1,
          image: 1,
          video: 1,
          createdAt: 1,
          updatedAt: 1
        }
      }
    ];

    // Execute the aggregation pipeline
    const recentComponents = await compModel.aggregate(pipeline);

    // Send the retrieved components as a response
    res.status(200).json({ success: true, data: recentComponents });
  } catch (error) {
    console.error('Error retrieving recent components:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});


function cloudinaryPost(req) {
  return new Promise((resolve, reject) => {
    if (!req.file || !req.file.buffer) {
      resolve(null);
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream((result, error) => {
      if (result) {
        console.timeLog('Result image:', result);
        resolve(result.secure_url);
      } else {
        console.error('Upload failed:', error);
        reject(error);
      }
    }, { folder: "task" });

    uploadStream.end(req.file.buffer);
  });
}





app.put('/update/:id',uploads.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { component, text } = req.body;

    let imageData = await cloudinaryPost(req);
    console.log({imageData});

    // Find the component by ID
    let updatedComponent = await compModel.findById(id);

    if (!updatedComponent) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }

    // Update the component data
    updatedComponent.component = component;
    updatedComponent.text = text;
    updatedComponent.image = imageData;
    updatedComponent.updatedAt = new Date();
    updatedComponent = await updatedComponent.save();

    res.status(200).json({ success: true, data: updatedComponent });
  } catch (error) {
    console.error('Error updating component:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});



app.get('/counts', (req, res) => {
  res.json({ addCount, updateCount });
});



  

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
