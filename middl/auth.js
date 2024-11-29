import jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"
import db from "../conn.js"

const secret = 'test'

export const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1]
    const isCustomAuth = token.length < 500;
    //console.log(req.params)
    let decodedData
console.log(jwt.verify(token, secret))
    if (token && isCustomAuth) {      
      decodedData = jwt.verify(token, secret)

      req.userId = decodedData?.id
      req.userEmail = decodedData.email
      
     
    } else {
      decodedData = jwt.decode(token)

      req.userId = decodedData?.sub
    }    
    
    next();
  } catch (error) {
    res.status(409).json({message: error.message})
  }
}
export const roleAuth = async(req, res, next) => {
	try{
		
	let itemQuery = {_id: new ObjectId(req.params.id)}
	let estateQuery = {_id: new ObjectId(req.params.id)}
	let userQuery = {_id: new ObjectId(req.userId)}
	console.log(estateQuery)
	
	let collectItems = await db.collection("items")
	let collectEstates = await db.collection("estates")
	let collectUsers = await db.collection("users")
	
	const item = await collectItems.findOne(itemQuery)
	const estate = await collectSeeds.findOne(estateQuery)
	const user = await collectUsers.findOne(userQuery)
	
	const owner = item?item.creator:estate.owner
	
	//console.log(seed||item)
   if((user.role==='owner'||req.userId === owner) || user.role==='admin'){next()}
   
   else{res.status(409).json({
	   message: 'User does not have permission to perform the action'})}
	//else{throw new Error('User cannot perform the action')}
	
	}catch(error){res.status(409).json({message: error.message})}}


