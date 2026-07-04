var express=require("express"); var app=express(); app.use(express.json());
var prisma=require('@prisma/client').default; var results=[];
