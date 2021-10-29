const express = require('express');
const router = express.Router();
const catchAsync = require('../utils/catchAsync.js');
const { isLoggedIn } = require('../middleware');
const tsp = require('../build/release/testaddon.node');
const fs = require('fs');

const Order = require("../models/orders");

//const finalStageOrder = new Array();
global.finalMapData = new Array();

async function outputDict(orders){
    const data = fs.readFileSync('bestSolution.txt').toString().replace(/\r\n/g,'\n').split('\n');
    //console.log(data[data.length - 2]);
    const finalOrder = data[data.length - 2].split(' ');
    finalOrder.pop();
    //console.log(finalOrder);
    finalMapData.length = 0;
    finalMapData.push({ latLng: { lat: 19.0760, lng:72.8777} });
    for(let routeOrder of finalOrder){
        routeOrder = parseInt(routeOrder); 
        finalMapData.push({ latLng: { lat: orders[routeOrder-1].lat, lng:orders[routeOrder-1].long} })
    }
    finalMapData.push({ latLng: { lat: 19.0760, lng:72.8777} });
     //console.log(finalMapData);
     
}

async function intoArray() {
    const orders = await Order.find({stage: 'pickedup'}).populate('userId').populate({
        path: 'cart',
        populate:{
            path: 'product'
        }
    });
    //console.log(orders.length);
    
    if(orders.length === 6){
        fs.writeFileSync('tsp-project.tsp', '');
        fs.writeFileSync('bestSolution.txt', '');
        fs.appendFileSync('tsp-project.tsp',"DIMENSION : 6\nEDGE_WEIGHT_TYPE : EUC_2D\nNODE_COORD_SECTION\n");
        let count = 1;
        for(let order of orders){
            //{ lat } = order;
            //{ long } = order;
            const x = 6400*order.long*Math.cos(19.022375);
            const y = 6400*order.lat;
            fs.appendFileSync('tsp-project.tsp',"\n" + count + " " + x + " "  + y);
            count += 1;
        } 
        fs.appendFileSync('tsp-project.tsp',"\nEOF\n");
        await tsp.hello();
        await outputDict(orders);
        //next();
    }
}

router.get('/status', isLoggedIn, catchAsync(async (req, res) => {
    const orders = await Order.find({}).populate('userId').populate({
        path: 'cart',
        populate:{
            path: 'product'
        }
    });
    //console.log(Object.keys(orders).length)
    res.render('orders/status2', {orders});
}))

router.get('/dashboard', isLoggedIn, catchAsync(async (req, res) => {
    const orders = await Order.find({}).populate('userId');
    //console.log(finalStageOrder);
    //console.log(finalStageOrder.length)
    const pickedOrders = await Order.find({stage: 'pickedup'});
    const len = pickedOrders.length;
    intoArray();
    res.render('orders/dashboard', { orders, len })
}))

router.get('/history', isLoggedIn, catchAsync( async (req, res) => {
    const orders = await Order.find({stage : 'history'}).populate('userId').populate({
        path: 'cart',
        populate:{
            path: 'product'
        }
    });
    // console.log(orders);
    // console.log(String(orders[0].orderNo))
    res.render('orders/history', { orders });
}))

router.post('/insert', catchAsync(async (req, res) => {
    const order = new Order(req.body.orders);
    await order.save();
    res.send(order);
}))

router.post('/topreparing/:id', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    const orderStatus = req.body.order.status;
    order.status = orderStatus;
    if(orderStatus === 'accept'){
        order.stage = 'preparing';
    }else{
        order.stage = 'history';
    }
    // console.log(order)
    await order.save();
    res.redirect('/orders/status')
}))

router.post('/dashboard/toprepared/:id', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    order.stage = 'prepared';
    await order.save();
    res.redirect('/orders/dashboard')
}))

router.post('/dashboard/topickedup/:id', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    order.stage = 'pickedup';
    await order.save();
    
    
    res.redirect('/orders/dashboard')
}))

router.post('/dashboard/toorderhistory/:id', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const order = await Order.findById(id);
    order.stage = 'history';
    await order.save();
    res.redirect('/orders/dashboard')
}))

router.get('/map', isLoggedIn, (req, res) => {
    //console.log(finalMapData);
    res.render('map/index2', { finalMapData })
})



module.exports = router;