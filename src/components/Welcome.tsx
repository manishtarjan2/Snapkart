'use client'
import React from 'react'
import { motion } from "motion/react"
import { ArrowRight, Bike, ShoppingBasket } from 'lucide-react'

type propType={
    nextStep: (s:number)=>void
}

function Welcome ({nextStep}:propType) {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen text-center p-6
    bg-gradient-to-b from-green-500 to-white'>

        <motion.div
  initial={{
    opacity: 0,
    scale:0.9,
    y: -20
  }}
  animate={{
    opacity: 1,
    y: 0
  }}
  transition={{ duration:1 }}
  className='flex items-center gap-3'
>
     <ShoppingBasket className='w-10 h-10 text-green-600' />
 <h1 className="text-4xl md:text-5xl font-extrabold text-green-700">Snapkart</h1>

</motion.div>

    <motion.p
    initial={{
      opacity: 0,
      y: 20
    }}
    animate={{
      opacity: 1,
      y: 0
    }}
    transition={{ duration: 1 }}
    className="text-lg md:text-xl text-gray-600 mt-4 font-bold"
  >
   Welcome to Snapkart - Your one-stop shop for all your needs!
 </motion.p >



  <motion.div
  initial={{
    opacity: 0,
    scale:0.9,
  }}
  animate={{
    opacity: 1,
    scale: 1
  }}
  transition={{ duration: 1 }}
    className='flex items-center gap-6 mt-8'
>
  <ShoppingBasket className='w-24 h-24 text-green-600' />
  <Bike className='w-24 h-24 text-orange-600' />


  </motion.div>

<motion.button
  initial={{
    opacity: 0,
    y: 20
  }}
  animate={{
    opacity: 1,
    y: 0
  }}
  transition={{ duration: 1 }}
  className="mt-10 px-6 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-green-300 font-semibold"
   onClick={()=>nextStep(2)}
   >

   
    Next
    <ArrowRight className='inline-block w-5 h-5 ml-2'/>
</motion.button>




</div>

  )
}

export default Welcome
