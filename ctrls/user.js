import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from "../conn.js"
import { ObjectId } from "mongodb"

const secret = 'test'

/*
db.runCommand( {
   collMod: "users",
   validator: { $jsonSchema: {
      bsonType: "object",
      required: [ "email", "name", "password" ],
      properties: {
         email: {
            bsonType: "string",
            description: "Phone must be a string and is required"
         },
         name: {
            bsonType: "string",
            description: "Name must be a string and is required"
         },
         password: {
            bsonType: "string",
            description: "Password must be a string and is required"
                }
      }
   } },
   validationLevel: "moderate"
} )
db.createCollection("users", {
		validator: {
			$jsonSchema:{
				bsonType: 'object',
				title: 'User Object Validation',
				required: ['name'],
				 properties: {
            name: {
               bsonType: "string",
               description: "'name' must be a string and is required"
            },
				}
			}}
		})*/

export const signin = async(req,res)=> {

  try{
	const {email, password} = req.body
	
	let collection = await db.collection("users")
	//~ console.log(collection)
	const oldUser = await collection.findOne({'email.address':email})
	console.log(oldUser)
	if(!oldUser) return res.status(404).json({message: "User doesn't exist"})
   
	const isPasswordCorrect = await bcrypt.compare(password, oldUser.password)
    if(!isPasswordCorrect) return res.status(400).json({message: 'Invalid credentials'})

    const token = jwt.sign({email: oldUser.email.address, 
		                    id: oldUser._id, 
		                    name: oldUser.name},
                            secret, {expiresIn: '1h'} )
                            
    res.status(200).json({user: oldUser, token})
	}catch(error){
		res.status(500).json({message: error})
	}
   }
   
    export const signup = async (req, res) => {

  try {
	const { name, email, password, role} = req.body
	console.log(req.body)
    //console.log(req)
	const collection = await db.collection("users")
    const oldUser = await collection.findOne({ 'email.address':email });
    if (oldUser) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const template = { email: {address: email, confirmed: false},
		               password: hashedPassword, name, role }
    console.log(template)
    const result = await collection.insertOne(template)
    
    const newUser = await collection.findOne({ 'email.address':email }) 
     
    console.log(newUser) 
    const token = jwt.sign( { email: newUser.email.address, 
		                      id: newUser._id , 
		                      name: newUser.name},
                              secret, { expiresIn: "1h" } )

    res.status(201).json({user: newUser, token })
    
  } catch (error) {
    res.status(500).json({ message: error })
  }
}

export const confirmEmail = async(req,res)=> {

  try{
	let collection = await db.collection("users")
	let query = { _id: new ObjectId(req.params.id) }
	
	const updates = {$set:{'email.confirmed':true}}                  
	
	let result = await collection.updateOne(query, updates)
	
    let updatedUser = await collection.findOne(query)
     console.log(updatedUser)              
    res.status(200).json(updatedUser)
	}catch(error){
		res.status(500).json({message: error})
	}}
   
  
