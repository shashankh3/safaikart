#!/bin/bash

# ==============================================================================
# SafaiKart: BigQuery Extension Deployment Script
# ==============================================================================
# This script configures and deploys the official Firebase Extension 
# for streaming Firestore data to BigQuery. This allows you to build 
# Data Studio (Looker) dashboards on your production data without 
# impacting database performance.
# ==============================================================================

echo "🚀 Setting up Firestore to BigQuery Extension..."

# 1. Install the extension using Firebase CLI
npx firebase-tools ext:install firebase/firestore-bigquery-export --project=default

# NOTE: When prompted by the interactive CLI, use the following configuration:
# 
# Collection path: orders
# Dataset ID: safaikart_analytics
# Table ID: orders_raw
# Location: asia-south1
# 
# This will automatically start syncing all new orders to BigQuery!

echo "✅ Once installed, you can query your data in the Google Cloud Console."
echo "   Go to: https://console.cloud.google.com/bigquery"
