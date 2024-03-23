import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const compSchema = new Schema({
  component: { type: [Number], required: true },
  text: { type: String },
  image: { type: String },
  createdAt: { type: Date, default: Date.now } ,
  updatedAt: { type: Date, default: Date.now }
});

const compModel = mongoose.model('compModel', compSchema);

export default compModel;
