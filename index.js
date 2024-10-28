import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

import itemRoutes from './routes/items.js'
import seedRoutes from './routes/seeds.js'
import userRoutes from './routes/user.js'

const app = express()


app.use(bodyParser.json({limit: '50mb'}))
app.use(cors())

app.use('/items', itemRoutes)
app.use('/seeds', seedRoutes)
app.use('/user', userRoutes)

app.get('/', (req,res)=>{
	res.send('Hello to Items API')
})
const PORT = process.env.PORT||5000

app.listen(PORT, ()=>console.log(`Running on ${PORT}`))
