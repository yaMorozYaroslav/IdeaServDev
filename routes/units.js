import express from 'express'
import {getEstateUnits, getEmptyUnits, getUnit, createUnit, 
	             updateUnit, deleteUnit} from '../ctrls/units.js'

const router = express.Router()
import {auth} from '../middl/auth.js'
import {roleAuth} from '../middl/auth.js'

router.get('/:estateID', getEstateUnits)
router.get('/all/empty', getEmptyUnits)
//~ router.get('/single/:unitID', getUnit)
//~ router.post('/', auth, createEstate)
router.post('/:estateID', auth, createUnit)
//~ router.patch('/:id', auth, roleAuth, updateEstate)
router.patch('/:unitID', auth, updateUnit)
router.delete('/:unitID', auth, deleteUnit)

export default router
