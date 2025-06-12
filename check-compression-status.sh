#!/bin/bash

# Quick status check script
INSTANCE_ID="i-03b14bbe12e067fb3"

echo "🎬 Video Compression Status Check"
echo "================================="

# Get instance info
echo "📊 Instance Status:"
aws ec2 describe-instances --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].[InstanceId,State.Name,PublicIpAddress,InstanceType]' \
    --output text

echo ""
echo "🔍 Checking S3 for completed files:"
aws s3 ls s3://medhdocuments/Website/ | grep compressed

echo ""
echo "📱 To monitor live progress, use:"
echo "ssh -i video-compression-key-*.pem ec2-user@\$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text) 'tail -f /var/log/user-data.log'"

echo ""
echo "🧹 To terminate when done:"
echo "aws ec2 terminate-instances --instance-ids $INSTANCE_ID" 