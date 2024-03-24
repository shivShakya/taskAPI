import express from 'express';
import env from 'dotenv';
import cors from 'cors';
import connectDB from './db.js';
import compModel from './schema.js'; 
import cloudinary from 'cloudinary'; 
import multer from 'multer';

//Inital setup
const PORT = 5000;
env.config();

const app = express();

app.use(cors());
app.use(express.json());


//Used cloudinary cloud plateform for storing images for free
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
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


const uploads = multer();

//upload api 
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


//Update based on recent Id
app.put('/update/:id',uploads.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { component, text } = req.body;

    let imageData = await cloudinaryPost(req);

    let updatedComponent = await compModel.findById(id);

    if (!updatedComponent) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }
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


// most recent changes based on component api used aggregate.
app.get('/recentComponents', async (req, res) => {
  try {

    const pipeline = [

      { $match: { component: { $in: [1, 2] } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$component',
          recentDocuments: { $push: '$$ROOT' }
        }
      },
      { $sort: { _id: 1 } },
      { $replaceRoot: { newRoot: { $arrayElemAt: ['$recentDocuments', 0] } } },
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
    const recentComponents = await compModel.aggregate(pipeline);
    res.status(200).json({ success: true, data: recentComponents });
  } catch (error) {
    console.error('Error retrieving recent components:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});



//number of call of API (ADD & Update) happen for a session 
let addCount = 0; 
let updateCount = 0; 

app.use((req, res, next) => {
  if (req.originalUrl === '/upload' && req.method === 'POST') {
    addCount++;
  } else if (req.originalUrl.startsWith('/update/') && req.method === 'PUT') {
    updateCount++;
  }
  next();
});


app.get('/counts', (req, res) => {
  res.json({ addCount, updateCount });
});


// creating a server
app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
