#!/bin/bash

# AWS Video Compression Workflow for Hero2.tsx
# This script sets up video compression in AWS using EC2 + FFmpeg

set -e

# Configuration
S3_BUCKET="medhdocuments"
S3_PREFIX="Website"
AWS_REGION="ap-south-1"
INSTANCE_TYPE="c5.4xlarge"  # CPU optimized for video processing
AMI_ID="ami-0dee22c13ea7a9a67"  # Amazon Linux 2023 AMI for ap-south-1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎬 AWS Video Compression Workflow${NC}"
echo "================================="

# Function to log with timestamp
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Step 1: Check if original videos exist in S3
log "Checking original videos in S3..."
echo "Checking for original videos:"
aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/ | grep -E "\.(mp4|webm)$" || {
    error "No video files found in s3://${S3_BUCKET}/${S3_PREFIX}/"
    exit 1
}

# Step 2: Create compression script for EC2
log "Creating FFmpeg compression script..."
cat > video-compression-script.sh << 'EOF'
#!/bin/bash

# Install FFmpeg on Amazon Linux 2023
sudo dnf update -y
sudo dnf install -y ffmpeg aws-cli

# Create working directory
mkdir -p /tmp/video-processing
cd /tmp/video-processing

# Download original videos from S3
echo "Downloading original videos..."
aws s3 cp s3://medhdocuments/Website/1659171_Trapcode_Particles_3840x2160.mp4 ./dark_theme_original.mp4
aws s3 cp s3://medhdocuments/Website/0_Flutter_Wind_3840x2160.mp4 ./light_theme_original.mp4

# Function to compress videos
compress_video() {
    local input_file="$1"
    local output_base="$2"
    local theme_type="$3"
    
    echo "🎬 Processing $theme_type theme video: $input_file"
    
    # WebM High Quality (Original Resolution)
    echo "Creating WebM high quality..."
    ffmpeg -i "$input_file" \
        -c:v libvpx-vp9 \
        -crf 28 \
        -b:v 0 \
        -threads 8 \
        -speed 2 \
        -tile-columns 6 \
        -frame-parallel 1 \
        -auto-alt-ref 1 \
        -lag-in-frames 25 \
        -g 999999 \
        -aq-mode 0 \
        -an \
        -y "${output_base}_compressed.webm"
    
    # MP4 High Quality (Original Resolution)
    echo "Creating MP4 high quality..."
    ffmpeg -i "$input_file" \
        -c:v libx264 \
        -preset slow \
        -crf 23 \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        -an \
        -y "${output_base}_compressed.mp4"
    
    # WebM Medium Quality (1080p)
    echo "Creating WebM 1080p..."
    ffmpeg -i "$input_file" \
        -vf scale=1920:1080 \
        -c:v libvpx-vp9 \
        -crf 32 \
        -b:v 0 \
        -threads 8 \
        -speed 4 \
        -tile-columns 6 \
        -frame-parallel 1 \
        -auto-alt-ref 1 \
        -lag-in-frames 25 \
        -g 999999 \
        -aq-mode 0 \
        -an \
        -y "${output_base}_1920x1080_compressed.webm"
    
    # MP4 Medium Quality (1080p)
    echo "Creating MP4 1080p..."
    ffmpeg -i "$input_file" \
        -vf scale=1920:1080 \
        -c:v libx264 \
        -preset slow \
        -crf 25 \
        -c:a aac \
        -b:a 96k \
        -movflags +faststart \
        -an \
        -y "${output_base}_1920x1080_compressed.mp4"
    
    # Create poster image
    echo "Creating poster image..."
    ffmpeg -i "$input_file" \
        -ss 00:00:05 \
        -vframes 1 \
        -f webp \
        -quality 85 \
        -y "${theme_type}_theme_poster.webp"
}

# Process Dark Theme Video
compress_video "dark_theme_original.mp4" "1659171_Trapcode_Particles_3840x2160" "dark"

# Process Light Theme Video  
compress_video "light_theme_original.mp4" "0_Technology_Abstract_4096x2304" "light"

# Upload compressed videos to S3
echo "📤 Uploading compressed videos to S3..."

# Upload all compressed files
aws s3 cp 1659171_Trapcode_Particles_3840x2160_compressed.webm s3://medhdocuments/Website/
aws s3 cp 1659171_Trapcode_Particles_3840x2160_compressed.mp4 s3://medhdocuments/Website/
aws s3 cp 1659171_Trapcode_Particles_1920x1080_compressed.webm s3://medhdocuments/Website/
aws s3 cp 1659171_Trapcode_Particles_1920x1080_compressed.mp4 s3://medhdocuments/Website/

aws s3 cp 0_Technology_Abstract_4096x2304_compressed.webm s3://medhdocuments/Website/
aws s3 cp 0_Technology_Abstract_4096x2304_compressed.mp4 s3://medhdocuments/Website/
aws s3 cp 0_Technology_Abstract_1920x1080_compressed.webm s3://medhdocuments/Website/
aws s3 cp 0_Technology_Abstract_1920x1080_compressed.mp4 s3://medhdocuments/Website/

# Upload poster images
aws s3 cp dark_theme_poster.webp s3://medhdocuments/Website/
aws s3 cp light_theme_poster.webp s3://medhdocuments/Website/

# Set proper content types and cache headers
echo "🔧 Setting S3 metadata..."
for file in \
    "1659171_Trapcode_Particles_3840x2160_compressed.webm" \
    "1659171_Trapcode_Particles_1920x1080_compressed.webm" \
    "0_Technology_Abstract_4096x2304_compressed.webm" \
    "0_Technology_Abstract_1920x1080_compressed.webm"
do
    aws s3 cp s3://medhdocuments/Website/$file s3://medhdocuments/Website/$file \
        --metadata-directive REPLACE \
        --content-type "video/webm" \
        --cache-control "max-age=31536000" \
        --expires "$(date -d '+1 year' --iso-8601)"
done

for file in \
    "1659171_Trapcode_Particles_3840x2160_compressed.mp4" \
    "1659171_Trapcode_Particles_1920x1080_compressed.mp4" \
    "0_Technology_Abstract_4096x2304_compressed.mp4" \
    "0_Technology_Abstract_1920x1080_compressed.mp4"
do
    aws s3 cp s3://medhdocuments/Website/$file s3://medhdocuments/Website/$file \
        --metadata-directive REPLACE \
        --content-type "video/mp4" \
        --cache-control "max-age=31536000" \
        --expires "$(date -d '+1 year' --iso-8601)"
done

for file in "dark_theme_poster.webp" "light_theme_poster.webp"
do
    aws s3 cp s3://medhdocuments/Website/$file s3://medhdocuments/Website/$file \
        --metadata-directive REPLACE \
        --content-type "image/webp" \
        --cache-control "max-age=31536000" \
        --expires "$(date -d '+1 year' --iso-8601)"
done

echo "✅ Video compression and upload completed!"

# Display file sizes
echo "📊 Final file sizes:"
ls -lh *.webm *.mp4 *.webp

# Cleanup
rm -f dark_theme_original.mp4 light_theme_original.mp4

echo "🎉 All done! Videos are ready for CloudFront."
EOF

# Step 3: Launch EC2 instance
log "Launching EC2 instance for video processing..."

# Create security group if it doesn't exist
SECURITY_GROUP_ID=$(aws ec2 describe-security-groups \
    --group-names "video-compression-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text 2>/dev/null || echo "None")

if [ "$SECURITY_GROUP_ID" = "None" ]; then
    log "Creating security group..."
    SECURITY_GROUP_ID=$(aws ec2 create-security-group \
        --group-name "video-compression-sg" \
        --description "Security group for video compression instance" \
        --query 'GroupId' \
        --output text)
    
    aws ec2 authorize-security-group-ingress \
        --group-id $SECURITY_GROUP_ID \
        --protocol tcp \
        --port 22 \
        --cidr 0.0.0.0/0
fi

# Create key pair if it doesn't exist
KEY_NAME="video-compression-key"
if ! aws ec2 describe-key-pairs --key-names $KEY_NAME >/dev/null 2>&1; then
    log "Creating key pair..."
    aws ec2 create-key-pair \
        --key-name $KEY_NAME \
        --query 'KeyMaterial' \
        --output text > ${KEY_NAME}.pem
    chmod 400 ${KEY_NAME}.pem
    warn "⚠️  Key pair saved as ${KEY_NAME}.pem - keep this file safe!"
fi

# Launch instance
log "Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --count 1 \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SECURITY_GROUP_ID \
    --query 'Instances[0].InstanceId' \
    --output text)

log "Instance launched: $INSTANCE_ID"
log "Waiting for instance to be running..."

aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get instance public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

log "Instance is running at: $PUBLIC_IP"
log "Waiting additional 30 seconds for SSH to be ready..."
sleep 30

# Step 4: Upload and execute compression script
log "Uploading compression script to instance..."
scp -i ${KEY_NAME}.pem -o StrictHostKeyChecking=no \
    video-compression-script.sh ec2-user@$PUBLIC_IP:/tmp/

log "Executing video compression on EC2..."
ssh -i ${KEY_NAME}.pem -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP \
    "chmod +x /tmp/video-compression-script.sh && /tmp/video-compression-script.sh"

# Step 5: Terminate instance
log "Cleaning up - terminating EC2 instance..."
aws ec2 terminate-instances --instance-ids $INSTANCE_ID >/dev/null

# Step 6: Verify uploads
log "Verifying compressed videos in S3..."
echo "✅ Compressed videos uploaded:"
aws s3 ls s3://${S3_BUCKET}/${S3_PREFIX}/ | grep compressed

echo ""
log "🎉 Video compression workflow completed successfully!"
echo ""
echo "Your compressed videos are now available at:"
echo "https://d2cxn2x1vtrou8.cloudfront.net/Website/"
echo ""
echo "Next steps:"
echo "1. Update your CloudFront distribution to ensure proper caching"
echo "2. Test the video loading in your Hero2.tsx component"
echo "3. Monitor performance and file sizes"
echo ""
warn "⚠️  Remember to delete the ${KEY_NAME}.pem file if you don't need it anymore" 