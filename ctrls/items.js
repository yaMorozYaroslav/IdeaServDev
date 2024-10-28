import express from 'express'
import db from "../conn.js"
import { ObjectId } from "mongodb"

export const getItems = async(req,res) => {
	try{    
	   let collection = await db.collection("items")
	   let category = req.query.category
	   let type = req.query.type
	   let search = req.query.search
	   let sort = req.query.sort==='true'?'true':''
	   //console.log(sort)
       let page = req.query.page ? req.query.page : 1;
       let limit = req.query.limit ? req.query.limit : 4;
       let skip = (page - 1) * limit
       let result
       
       if(!search||(search && !search.length))result =
                                    await collection.aggregate([
  
   {$facet: {
    'data':[
      {$match: category?{category: `${category}`}:{}},
	  {$match: type?{type: `${type}`}:{}},
	  {$sort: sort?{price: 1}:{price: -1}},  
      {$skip: parseInt(`${skip}`)},
      {$limit: parseInt(`${limit}`)},							
		    ],
		    
    'calculate':[
      {$match: category?{category: `${category}`}:{}},
      {$match: type?{type: `${type}`}:{}},
      {$count: 'count'}
               ]
             }},
     {$unwind: '$calculate'},
     {$addFields: { totalPages:{ $ceil: {
           $divide: ['$calculate.count'||0, Number(`${limit}`)]
          }},  
          currPage: Number(`${page}`)}}
      ]).toArray()
      
     if(search){result = await collection.aggregate([
	                  {$match:{$text: {$search: `\"${search}\"`}}},
                 {$facet: {
                    'data':[
                     {$sort: sort?{price: 1}:{price: -1}}, 
                     {$skip: parseInt(`${skip}`)},
                     {$limit: parseInt(`${limit}`)}
                    ],
                    'calculate':[{$count: 'count'}] }},
                 {$unwind: '$calculate'},
                 {$addFields: { totalPages:{ $ceil: {
                    $divide: ['$calculate.count'||0, Number(`${limit}`)]
                     }},  
                      currPage: Number(`${page}`)}}                  
                     ]).toArray()
                    }
    // console.log(!result[0].calculate[0])
	 if(!result[0]){res.status(200).json({data:[], message: 'nothing'})
	 }else{res.status(200).json(result[0])}
	 
	}catch(error){
		res.status(404).json({message: error.message})
	}
   }

export const getItem = async(req, res) => {
	try{
		let collection = await db.collection("items")
		let query = {_id: new ObjectId(req.params.id)}
	//console.log(query)
		const item = await collection.findOne(query)
		res.send(item).status(200)
	}catch(error){res.status(404).json({message: error.message})}
}

export const createItem = async(req,res)=> {
      try{
    let item = req.body
    let collection = await db.collection("items")
	const newItem = {...item, 
		             creator: req.userId, 
		             date: new Date().toISOString()}
	let result = await collection.insertOne(newItem)
	//console.log(result)	  
		res.send(newItem).status(204)
	}catch(error){
		res.status(409).json({message: error.message})
	}
}
export const updateItem = async(req, res)=> {
   try{
    const query = { _id: new ObjectId(req.params.id) }
    const {_id, ...rest} = req.body
    const updates = {$set:{...rest, date: new Date().toISOString()}}
    let collection = await db.collection("items")
    const item = await collection.findOne(query)
	
    if(!item)
	 return res.send({message:`No post with id:${query._id}`}).status(404)
	
    let result = await collection.updateOne(query, updates)
    let newItem = await collection.findOne(query)
    res.send(newItem).status(201)
}catch(error){
		res.status(409).json({message: error.message})
	}}

export const deleteItem = async(req,res)=> {
  try{
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("items")
    const item = await collection.findOne(query)
    
	if(!item)
	 return res.send({message:`No post with id:${query._id}`}).status(404)
	 
	let result = await collection.deleteOne(query)
	res.send({ message: 'Post deleted', ...query}).status(200)
}catch(error){res.status(409).json({message: error.message})}
 }
