import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import googleRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';

dotenv.config();

const app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  //~ origin: '*',
  origin: ["https://idea-sphere-50bb3c5bc07b.herokuapp.com",
           "http://localhost:3000"],
  
  credentials: true
}));

app.set("trust proxy", 1);

app.use('/google', googleRoutes);
app.use('/questions', questionRoutes);

app.get('/', (req, res) => {
  res.send('Hello to Idea Sphere API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
