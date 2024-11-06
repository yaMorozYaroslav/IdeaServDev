import express from 'express'
import db from "../conn.js"
import { ObjectId } from "mongodb"

export const getEmptyUnits = async(req, res) => {
	try{    
	   let collection = await db.collection("units")
	   
       let page = req.query.page ? req.query.page : 1;
       let limit = req.query.limit ? req.query.limit : 4;
       let skip = (page - 1) * limit
    
       let result = await collection.aggregate([
                                 
  
   {$facet: {
    'data':[
      //~ {$match: category?{category: `${category}`}:{}},
	  {$match:{tenant: ''}},
	  {$group:{_id: "$estateID", quantity: {"$sum":1}}}
	  //~ {$sort: sort?{price: 1}:{price: -1}},  
      //~ {$skip: parseInt(`${skip}`)},
      //~ {$limit: parseInt(`${limit}`)},							
		    ],
		    
    'calculate':[
      //~ {$match: category?{category: `${category}`}:{}},
      {$match: {tenant: ''}},
      {$count: 'count'}
               ]
             }},
     
      ]).toArray()
      
    
	 if(!result[0]){res.status(200).json({data:[], message: 'nothing'})
	 }else{res.status(200).json(result[0])}
	 
	}catch(error){
		res.status(404).json({message: error.message})
	}
   }
export const getEstateUnits = async(req,res) => {
	try{    
	   let collection = await db.collection("units")
	   let estateID = req.params.estateID
	   
       let page = req.query.page ? req.query.page : 1;
       let limit = req.query.limit ? req.query.limit : 4;
       let skip = (page - 1) * limit
    
       let result = await collection.aggregate([
                                 
  
   {$facet: {
    'data':[
	  {$match: {estateID: `${estateID}`}},
	  //~ {$sort: sort?{price: 1}:{price: -1}},  
      {$skip: parseInt(`${skip}`)},
      {$limit: parseInt(`${limit}`)},							
		    ],
		    
    'calculate':[
      //~ {$match: category?{category: `${category}`}:{}},
      {$match: {estateID: `${estateID}`}},
      {$count: 'count'}
               ]
             }},
     {$unwind: '$calculate'},
     {$addFields: { totalPages:{ $ceil: {
                       $divide: ['$calculate.count'||0, 
                                             Number(`${limit}`)] }},        
                    currPage: Number(`${page}`)}}
      ]).toArray()
      
     //~ if(search){result = await collection.aggregate([
	                  //~ {$match:{$text: {$search: `\"${search}\"`}}},
                 //~ {$facet: {
                    //~ 'data':[
                     //~ {$sort: sort?{price: 1}:{price: -1}}, 
                     //~ {$skip: parseInt(`${skip}`)},
                     //~ {$limit: parseInt(`${limit}`)}
                    //~ ],
                    //~ 'calculate':[{$count: 'count'}] }},
                 //~ {$unwind: '$calculate'},
                 //~ {$addFields: { totalPages:{ $ceil: {
                    //~ $divide: ['$calculate.count'||0, Number(`${limit}`)]
                     //~ }},  
                      //~ currPage: Number(`${page}`)}}                  
                     //~ ]).toArray()
                    //~ }
    // console.log(!result[0].calculate[0])
	 if(!result[0]){res.status(200).json({data:[], message: 'nothing'})
	 }else{res.status(200).json(result[0])}
	 
	}catch(error){
		res.status(404).json({message: error.message})
	}
   }

export const getUnit = async(req, res) => {
	try{
		let collection = await db.collection("units")
		let query = {_id: new ObjectId(req.params.unitID)}
	//console.log(query)
		const unit = await collection.findOne(query)
		res.send(unit).status(200)
	}catch(error){res.status(404).json({message: error.message})}
}

export const createUnit = async(req,res)=> {
      try{
    let unit = req.body
    let estateID = req.params.estateID
   
    let collection = await db.collection("units")
	const newUnit = {...unit,
		             tenant: '',
		             estateID: estateID, 
		             date: new Date().toISOString()}
	let result = await collection.insertOne(newUnit)
	console.log(newUnit)	  
		res.send(newUnit).status(204)
	}catch(error){
		res.status(409).json({message: error.message})
	}
}
export const updateUnit = async(req, res)=> {
   try{
    const query = { _id: new ObjectId(req.params.unitID) }
    const {_id, ...rest} = req.body
    const updates = {$set:{...rest, date: new Date().toISOString()}}
    let collection = await db.collection("units")
    const unit = await collection.findOne(query)
	
    if(!unit)
	 return res.send({message:`No post with id:${query._id}`}).status(404)
	
    let result = await collection.updateOne(query, updates)
    let newUnit = await collection.findOne(query)
    res.send(newUnit).status(201)
}catch(error){
		res.status(409).json({message: error.message})
	}}

export const deleteUnit = async(req,res)=> {
  try{
    const query = { _id: new ObjectId(req.params.unitID) };

    const collection = db.collection("units")
    const unit = await collection.findOne(query)
    
	if(!unit)
	 return res.send({message:`No post with id:${query._id}`}).status(404)
	 
	let result = await collection.deleteOne(query)
	res.send({ message: 'Post deleted', ...query}).status(200)
}catch(error){res.status(409).json({message: error.message})}
 }
