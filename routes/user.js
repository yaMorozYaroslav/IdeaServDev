import express from 'express'
const router = express.Router()

import {signin, signup, confirmEmail} from '../ctrls/user.js'

router.post('/signin', signin)
router.post('/signup', signup)
router.get('/confirmation/:id', confirmEmail)

export default router
