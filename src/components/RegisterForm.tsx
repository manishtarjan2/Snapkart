import { motion } from "framer-motion";
import { ArrowLeft, EyeIcon, EyeOff, Key, Leaf, Loader2, Lock, LogIn, Mail, User } from 'lucide-react'
import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);




type propType = {
  priviousStep: (s: number) => void
}

function RegisterForm({ priviousStep }: propType) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassowrd] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await axios.post("api/auth/register", {
        name, email, password
      })
      router.push("/login")
      setLoading(false)

    } catch (error) {
      console.log(error)
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col  items-center justify-center min-h-screen text-center p-6'>

      <div className='absolute top-6 left-6 flex items-center gap2 text-green-700 hover:text-green-800  transition-colors cursor-pointer'>
        <ArrowLeft className='w-5 h-5' />
        <span>Back</span>
      </div>

      <motion.h1
        initial={{
          opacity: 0,
          y: -20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{ duration: 1 }}
        className="text-4xl font-extrabold text-green-700 mb-2"
      >
        Create Account
      </motion.h1>

      <p className='text-gray-600 mb-8 flex item-center'>Sanapkart Today
        <Leaf className='w-5 h-5 text-green-600' /></p>



      <motion.form onSubmit={handleRegister}
        initial={{
          opacity: 0,
          y: -20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        transition={{ duration: 1 }}
        className="space-y-6"
      >

        <div className='relative'>
          <User className='absolute left-3 top-3.5 w-5 h-5 text-gray-400' />
          <input type="text" placeholder="Enter your Name"
            className='w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-2 focus-green-500 focus:outline-none'
            onChange={(e) => setName(e.target.value)}
            value={name} />
        </div>


        <div className='relative'>
          <Mail className='absolute left-3 top-3.5 w-5 h-5 text-gray-400' />
          <input type="text" placeholder="Enter your Email"
            className='w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-2 focus-green-500 focus:outline-none'
            onChange={(e) => setEmail(e.target.value)}
            value={email} />

        </div>



        <div className="relative">
          <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your Password"
            className="w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-800 focus:ring-2 focus:ring-green-500 focus:outline-none"
            onChange={(e) => setPassowrd(e.target.value)}
            value={password}
          />
          {showPassword ? (
            <EyeOff
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(false)}
            />
          ) : (
            <EyeIcon
              className="absolute right-3 top-3.5 w-5 h-5 text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(true)}
            />
          )}

        </div>

        {
          (() => {
            const formValidation = name !== "" && email !== "" && password !== ""
            return <button disabled={!formValidation || loading} className={`w-full font-semibold py-3 rounded-xl transition-all
            duration-200 shadow-md inline-flex items-center justify-center gap-2 ${formValidation
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`} >
              {loading && <Loader2 className="animate-spin mr-2" />}


              Register


            </button>

          })()
        }

        <div className="flex items-center gap-2 text-gray-400 text-sm mt-2">
          <span className="flex-1 h-px bg-gray-200"></span>
          OR
          <span className="flex-1 h-px bg-gray-200"></span>
        </div>

        <div className="w-full flex items-center justify-center gap-3 border border-gray-300 hover:bg-gray-50 py-3 rounded-xl text-gray-700 font-medium transition-all duration-200"
          onClick={() => signIn("google", { callbackUrl: "/" })}>
          <GoogleIcon />
          Continue with Google
        </div>
      </motion.form>

      <p className=" cursor-pointer text-gray-600 mt-6 text-sm flex items-center gap-1"
        onClick={() => router.push("/login")}>
        Already have an account?<LogIn className="w-4 h-4" />
        <span className="text-green-600">Sign in</span>
      </p>

      <p className="cursor-pointer text-gray-600 mt-2 text-sm flex items-center gap-1"
        onClick={() => router.push("/admin-login")}> 
        Are you staff or an admin?<Key className="w-4 h-4" />
        <span className="text-green-600">Admin login</span>
      </p>
    </div>
  )
}

export default RegisterForm;

