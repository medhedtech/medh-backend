#!/bin/bash

# Simplified EC2 Video Compression Script
set -e

# Configuration
S3_BUCKET="medhdocuments"
AWS_REGION="ap-south-1"
INSTANCE_TYPE="c5.2xlarge"
AMI_ID="ami-0dee22c13ea7a9a67"  # Amazon Linux 2023
KEY_NAME="video-compression-key-$(date +%s)"

echo "🎬 Starting EC2 Video Compression"
echo "================================="

# Step 1: Create key pair
echo "Creating SSH key pair..."
aws ec2 create-key-pair \
    --key-name $KEY_NAME \
    --query 'KeyMaterial' \
    --output text > ${KEY_NAME}.pem

chmod 400 ${KEY_NAME}.pem
echo "✅ Key pair created: ${KEY_NAME}.pem"

# Step 2: Get default VPC and security group
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
DEFAULT_SG=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$DEFAULT_VPC" "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text)

echo "Using default VPC: $DEFAULT_VPC"
echo "Using default security group: $DEFAULT_SG"

# Step 3: Add SSH rule to default security group if not exists
aws ec2 authorize-security-group-ingress \
    --group-id $DEFAULT_SG \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "SSH rule already exists"

# Step 4: Create user data script
cat > user-data.sh << 'EOF'
#!/bin/bash
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

# Update system
dnf update -y

# Install FFmpeg and dependencies
dnf install -y ffmpeg aws-cli

# Create processing directory
mkdir -p /home/ec2-user/video-processing
cd /home/ec2-user/video-processing

# Download original videos
echo "Downloading original videos..."
aws s3 cp s3://medhdocuments/Website/1659171_Trapcode_Particles_3840x2160.mp4 ./dark_original.mp4
aws s3 cp s3://medhdocuments/Website/0_Wind_Flowing_3840x2160.mp4 ./light_original.mp4

echo "Starting video compression..."

# Dark theme - WebM high quality
echo "Processing dark theme WebM high quality..."
ffmpeg -i dark_original.mp4 \
    -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 \
    -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
    -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 1659171_Trapcode_Particles_3840x2160_compressed.webm

# Dark theme - MP4 high quality  
echo "Processing dark theme MP4 high quality..."
ffmpeg -i dark_original.mp4 \
    -c:v libx264 -preset slow -crf 23 -movflags +faststart -an \
    -y 1659171_Trapcode_Particles_3840x2160_compressed.mp4

# Dark theme - WebM 1080p
echo "Processing dark theme WebM 1080p..."
ffmpeg -i dark_original.mp4 \
    -vf scale=1920:1080 -c:v libvpx-vp9 -crf 32 -b:v 0 \
    -threads 8 -speed 4 -tile-columns 6 -frame-parallel 1 \
    -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 1659171_Trapcode_Particles_1920x1080_compressed.webm

# Dark theme - MP4 1080p
echo "Processing dark theme MP4 1080p..."
ffmpeg -i dark_original.mp4 \
    -vf scale=1920:1080 -c:v libx264 -preset slow -crf 25 \
    -movflags +faststart -an \
    -y 1659171_Trapcode_Particles_1920x1080_compressed.mp4

# Light theme - WebM high quality
echo "Processing light theme WebM high quality..."
ffmpeg -i light_original.mp4 \
    -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 \
    -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
    -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 0_Technology_Abstract_4096x2304_compressed.webm

# Light theme - MP4 high quality
echo "Processing light theme MP4 high quality..."
ffmpeg -i light_original.mp4 \
    -c:v libx264 -preset slow -crf 23 -movflags +faststart -an \
    -y 0_Technology_Abstract_4096x2304_compressed.mp4

# Light theme - WebM 1080p
echo "Processing light theme WebM 1080p..."
ffmpeg -i light_original.mp4 \
    -vf scale=1920:1080 -c:v libvpx-vp9 -crf 32 -b:v 0 \
    -threads 8 -speed 4 -tile-columns 6 -frame-parallel 1 \
    -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
    -y 0_Technology_Abstract_1920x1080_compressed.webm

# Light theme - MP4 1080p
echo "Processing light theme MP4 1080p..."
ffmpeg -i light_original.mp4 \
    -vf scale=1920:1080 -c:v libx264 -preset slow -crf 25 \
    -movflags +faststart -an \
    -y 0_Technology_Abstract_1920x1080_compressed.mp4

# Create poster images
echo "Creating poster images..."
ffmpeg -i dark_original.mp4 -ss 00:00:05 -vframes 1 -f webp -quality 85 -y dark_theme_poster.webp
ffmpeg -i light_original.mp4 -ss 00:00:05 -vframes 1 -f webp -quality 85 -y light_theme_poster.webp

# Upload compressed files to S3
echo "Uploading compressed files to S3..."

# Upload WebM files
for file in *_compressed.webm; do
    aws s3 cp "$file" s3://medhdocuments/Website/ \
        --content-type "video/webm" \
        --cache-control "max-age=31536000"
done

# Upload MP4 files
for file in *_compressed.mp4; do
    aws s3 cp "$file" s3://medhdocuments/Website/ \
        --content-type "video/mp4" \
        --cache-control "max-age=31536000"
done

# Upload WebP images
for file in *_poster.webp; do
    aws s3 cp "$file" s3://medhdocuments/Website/ \
        --content-type "image/webp" \
        --cache-control "max-age=31536000"
done

echo "Video compression completed!"
echo "File sizes:"
ls -lh *_compressed.* *_poster.*

# Create completion flag
touch /tmp/compression-complete

echo "All processing completed successfully!"
EOF

# Step 5: Launch EC2 instance
echo "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $DEFAULT_SG \
    --user-data file://user-data.sh \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"
echo "⏳ Waiting for instance to be running..."

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "✅ Instance is running at: $PUBLIC_IP"
echo ""
echo "🎬 Video compression is now running on the EC2 instance!"
echo "📊 Processing status:"
echo "• Dark theme: 1659171_Trapcode_Particles_3840x2160.mp4 (186 MB)"
echo "• Light theme: 0_Wind_Flowing_3840x2160.mp4 (503 MB)"
echo "• Expected processing time: 15-20 minutes"
echo ""
echo "📱 You can monitor progress with:"
echo "ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP 'tail -f /var/log/user-data.log'"
echo ""

# Monitor processing
echo "🔄 Monitoring compression progress..."
COMPLETED=false
ATTEMPTS=0
MAX_ATTEMPTS=60  # 30 minutes max

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ] && [ "$COMPLETED" = false ]; do
    sleep 30
    ATTEMPTS=$((ATTEMPTS + 1))
    
    # Check if compression is complete
    if ssh -i ${KEY_NAME}.pem -o StrictHostKeyChecking=no -o ConnectTimeout=10 ec2-user@$PUBLIC_IP 'test -f /tmp/compression-complete' 2>/dev/null; then
        COMPLETED=true
        echo "✅ Video compression completed!"
        break
    fi
    
    echo "⏳ Still processing... (${ATTEMPTS}/60 checks)"
done

if [ "$COMPLETED" = false ]; then
    echo "⚠️  Processing is taking longer than expected. Check manually:"
    echo "ssh -i ${KEY_NAME}.pem ec2-user@$PUBLIC_IP"
    echo ""
    echo "❓ Continue waiting? (y/N)"
    read -r CONTINUE
    if [[ ! $CONTINUE =~ ^[Yy]$ ]]; then
        echo "Exiting monitoring. Instance will continue processing."
        exit 0
    fi
fi

# Verify uploads
echo "🔍 Verifying uploaded files..."
echo "Compressed videos in S3:"
aws s3 ls s3://${S3_BUCKET}/Website/ | grep compressed

# Cleanup
echo "🧹 Cleaning up..."
aws ec2 terminate-instances --instance-ids $INSTANCE_ID >/dev/null
aws ec2 delete-key-pair --key-name $KEY_NAME
rm -f ${KEY_NAME}.pem user-data.sh

echo ""
echo "🎉 Video compression workflow completed!"
echo ""
echo "✅ Your compressed videos are now available at:"
echo "https://d2cxn2x1vtrou8.cloudfront.net/Website/"
echo ""
echo "📋 Generated files:"
echo "• 1659171_Trapcode_Particles_3840x2160_compressed.webm"
echo "• 1659171_Trapcode_Particles_3840x2160_compressed.mp4"
echo "• 1659171_Trapcode_Particles_1920x1080_compressed.webm"
echo "• 1659171_Trapcode_Particles_1920x1080_compressed.mp4"
echo "• 0_Wind_Flowing_3840x2160_compressed.webm"
echo "• 0_Wind_Flowing_3840x2160_compressed.mp4"
echo "• 0_Wind_Flowing_1920x1080_compressed.webm"
echo "• 0_Wind_Flowing_1920x1080_compressed.mp4"
echo "• dark_theme_poster.webp"
echo "• light_theme_poster.webp"
echo ""
echo "🚀 Ready for your Hero2.tsx component!" 