"use client"

import { useEffect, useState } from "react"
import { motion, useSpring, useTransform } from "framer-motion"

interface OdometerProps {
  value: number
  className?: string
}

export function Odometer({ value, className = "" }: OdometerProps) {
  const spring = useSpring(0, {
    mass: 1,
    stiffness: 50,
    damping: 15,
  })

  // Whenever the value changes, animate the spring to the new value
  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  // Transform the continuous spring value into an integer string
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString())

  return <motion.span className={className}>{display}</motion.span>
}
