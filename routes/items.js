import express from 'express'
import {getItems, getItem, createItem, updateItem, deleteItem} from '../ctrls/items.js'

const router = express.Router()
import {auth} from '../middl/auth.js'
import {roleAuth} from '../middl/auth.js'

router.get('/', getItems)
router.get('/:id', getItem)
router.post('/', auth, createItem)
router.patch('/:id', auth, roleAuth, updateItem)
router.delete('/:id', auth, roleAuth, deleteItem)

export default router
