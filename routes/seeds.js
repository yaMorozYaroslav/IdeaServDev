import express from 'express'
import {getSeeds, getSeed, createSeed, 
	             updateSeed, deleteSeed} from '../ctrls/seeds.js'

const router = express.Router()
import {auth} from '../middl/auth.js'
import {roleAuth} from '../middl/auth.js'

router.get('/', getSeeds)
router.get('/:id', getSeed)
router.post('/', auth, createSeed)
router.patch('/:id', auth, roleAuth, updateSeed)
router.delete('/:id', auth, roleAuth, deleteSeed)

export default router
