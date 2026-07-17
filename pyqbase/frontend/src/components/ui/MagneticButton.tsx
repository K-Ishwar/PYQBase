"use client"

import React, { useRef, useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface MagneticButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  magneticPull?: number // Controls how strong the pull is
}

export function MagneticButton({ 
  children, 
  className, 
  magneticPull = 0.8,
  ...props 
}: MagneticButtonProps) {
  return (
    <div
      className={cn("relative inline-block transition-shadow duration-300", className)}
      {...props}
    >
      {children}
    </div>
  )
}
