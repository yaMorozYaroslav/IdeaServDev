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
  origin: 'http://localhost:3000', // Change this if frontend runs on a different port
  credentials: true
}));

app.use('/google', googleRoutes);
app.use('/questions', questionRoutes);

app.get('/', (req, res) => {
  res.send('Hello to Idea Sphere API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
