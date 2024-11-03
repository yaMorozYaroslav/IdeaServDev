import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import estateRoutes from './routes/estates.js'
import userRoutes from './routes/user.js'

const app = express()


app.use(bodyParser.json({limit: '50mb'}))
app.use(cors())

app.use('/estates', estateRoutes)
app.use('/user', userRoutes)

app.get('/', (req,res)=>{
	res.send('Hello to HasanProperty API')
})
const PORT = process.env.PORT||5000

app.listen(PORT, ()=>console.log(`Running on ${PORT}`))
