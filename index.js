import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import passport from './passport-setup.js';

import estateRoutes from './routes/estates.js'
import userRoutes from './routes/user.js'
import unitRoutes from './routes/units.js'
import googleRoutes from './routes/google.js'
import {sendEmail} from './sendEmail.js'

const app = express()

app.use(bodyParser.json({limit: '50mb'}))
app.use(cors())
app.use(passport.initialize());

app.use('/units', unitRoutes)
app.use('/estates', estateRoutes)
app.use('/user', userRoutes)
app.use('/google', googleRoutes)

app.get('/', (req,res)=>{
	res.send('Hello to Hesen Properties API')
})
app.post('/email', sendEmail)

const PORT = process.env.PORT||5000

app.listen(PORT, ()=>console.log(`Running on ${PORT}`))
