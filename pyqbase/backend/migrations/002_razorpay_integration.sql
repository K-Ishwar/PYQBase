-- Migration: 002_razorpay_integration.sql

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS razorpay_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS razorpay_subscription_id VARCHAR(255);
