import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import googleRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import {sendEmail} from './sendEmail.js'


dotenv.config();

const app = express();
//dd
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(cors({
  //~ origin: '*',
  origin: ["https://idea-sphere.vercel.app",
           "https://idea-sphere-dev.vercel.app",
           "http://localhost:3000",
           "https://very-portfolio.vercel.app"],

  credentials: true,
  //~ allowedHeaders: ["Content-Type", "Authorization"]
}));

app.set("trust proxy", 1);

app.use('/google', googleRoutes);
app.use('/questions', questionRoutes);
app.post('/email', sendEmail)


app.get('/', (req, res) => {
  res.send('Hello to Idea Sphere API');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Running on ${PORT}`));
