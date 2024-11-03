import express from 'express'
import {getUnits, getUnite, createUnit, 
	             updateUnit, deleteUnit} from '../ctrls/units.js'

const router = express.Router()
import {auth} from '../middl/auth.js'
import {roleAuth} from '../middl/auth.js'

router.get('/', getUnits)
router.get('/:id', getUnit)
//~ router.post('/', auth, createEstate)
router.post('/', auth, createUnit)
//~ router.patch('/:id', auth, roleAuth, updateEstate)
router.patch('/:id', auth, updateUnit)
router.delete('/:id', auth, deleteUnit)

export default router
