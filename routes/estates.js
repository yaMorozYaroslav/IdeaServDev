import express from 'express'
import {getEstates, getEstate, createEstate, 
	             updateEstate, deleteEstate} from '../ctrls/estates.js'

const router = express.Router()
import {auth} from '../middl/auth.js'
import {roleAuth} from '../middl/auth.js'

router.get('/', getEstates)
router.get('/:id', getEstate)
//~ router.post('/', auth, createEstate)
router.post('/', auth, createEstate)
//~ router.patch('/:id', auth, roleAuth, updateEstate)
router.patch('/:id', auth, updateEstate)
router.delete('/:id', deleteEstate)

export default router
