import express from 'express'
import db from "../conn.js"
import { ObjectId } from "mongodb"

export const getEstates = async(req,res) => {
	try{    
	   let collection = await db.collection("estates")
	   //~ let category = req.query.category
	   let location = req.query.location
	   let search = req.query.search
	 //console.log(search)
	   //~ let sort = req.query.sort==='true'?'true':''
       let page = req.query.page ? req.query.page : 1;
       let limit = req.query.limit ? req.query.limit : 4;
       let skip = (page - 1) * limit
     //console.log(category, type, search, sort, page, limit, skip)
       let result
       
       if(!search||(search && !search.length))result =
                                    await collection.aggregate([
  
   {$facet: {
    'data':[
      //~ {$match: category?{category: `${category}`}:{}},
	  {$match: location?{location: `${location}`}:{}},
	  //~ {$sort: sort?{price: 1}:{price: -1}},  
      {$skip: parseInt(`${skip}`)},
      {$limit: parseInt(`${limit}`)},							
		    ],
		    
    'calculate':[
      //~ {$match: category?{category: `${category}`}:{}},
      {$match: location?{location: `${type}`}:{}},
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

export const getEstate = async(req, res) => {
	try{
		let collection = await db.collection("estates")
		let query = {_id: new ObjectId(req.params.id)}
	//console.log(query)
		const item = await collection.findOne(query)
		res.send(item).status(200)
	}catch(error){res.status(404).json({message: error.message})}
}

export const createEstate = async(req,res)=> {
      try{
    let item = req.body
    console.log(req.userName)
    let collection = await db.collection("estates")
	const newItem = {...item,
		             owner: req.userName, 
		             date: new Date().toISOString()}
	let result = await collection.insertOne(newItem)
	//console.log(result)	  
		res.send(newItem).status(204)
	}catch(error){
		res.status(409).json({message: error.message})
	}
}
export const updateEstate = async(req, res)=> {
   try{
    const query = { _id: new ObjectId(req.params.id) }
    const {_id, ...rest} = req.body
    const updates = {$set:{...rest, owner: req.userName, 
		                      date: new Date().toISOString()}}
    let collection = await db.collection("estates")
    const item = await collection.findOne(query)
	
    if(!item)
	 return res.send({message:`No post with id:${query._id}`}).status(404)
	
    let result = await collection.updateOne(query, updates)
    let newItem = await collection.findOne(query)
    res.send(newItem).status(201)
}catch(error){
		res.status(409).json({message: error.message})
	}}

export const deleteEstate = async(req,res)=> {
  try{
    const query = { _id: new ObjectId(req.params.id) };

    const collection = db.collection("estates")
    const item = await collection.findOne(query)
    
	if(!item)
	 return res.send({message:`No post with id:${query._id}`}).status(404)
	 
	let result = await collection.deleteOne(query)
	res.send({ message: 'Post deleted', ...query}).status(200)
}catch(error){res.status(409).json({message: error.message})}
 }
