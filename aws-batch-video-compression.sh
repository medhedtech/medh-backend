#!/bin/bash

# AWS Batch Video Compression Alternative
# More cost-effective for one-time processing

set -e

S3_BUCKET="medhdocuments"
S3_PREFIX="Website"
AWS_REGION="ap-south-1"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🎬 AWS Batch Video Compression Setup${NC}"
echo "===================================="

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Create Dockerfile for FFmpeg container
log "Creating Docker container for video compression..."
cat > Dockerfile << 'EOF'
FROM public.ecr.aws/amazonlinux/amazonlinux:2023

# Install FFmpeg and AWS CLI
RUN dnf update -y && \
    dnf install -y ffmpeg aws-cli && \
    dnf clean all

# Create processing script
COPY process-videos.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/process-videos.sh

ENTRYPOINT ["/usr/local/bin/process-videos.sh"]
EOF

# Create the processing script
cat > process-videos.sh << 'EOF'
#!/bin/bash
set -e

echo "🎬 Starting video compression process..."

# Create working directory
mkdir -p /tmp/video-processing
cd /tmp/video-processing

# Download original videos from S3
echo "📥 Downloading original videos..."
aws s3 cp s3://medhdocuments/Website/1659171_Trapcode_Particles_3840x2160.mp4 ./dark_theme_original.mp4
aws s3 cp s3://medhdocuments/Website/0_Flutter_Wind_3840x2160.mp4 ./light_theme_original.mp4

# Function to compress videos (same as before)
compress_video() {
    local input_file="$1"
    local output_base="$2"
    local theme_type="$3"
    
    echo "🎬 Processing $theme_type theme video: $input_file"
    
    # WebM High Quality
    ffmpeg -i "$input_file" \
        -c:v libvpx-vp9 -crf 28 -b:v 0 -threads 8 -speed 2 \
        -tile-columns 6 -frame-parallel 1 -auto-alt-ref 1 \
        -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
        -y "${output_base}_compressed.webm"
    
    # MP4 High Quality
    ffmpeg -i "$input_file" \
        -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k \
        -movflags +faststart -an \
        -y "${output_base}_compressed.mp4"
    
    # WebM 1080p
    ffmpeg -i "$input_file" \
        -vf scale=1920:1080 -c:v libvpx-vp9 -crf 32 -b:v 0 \
        -threads 8 -speed 4 -tile-columns 6 -frame-parallel 1 \
        -auto-alt-ref 1 -lag-in-frames 25 -g 999999 -aq-mode 0 -an \
        -y "${output_base}_1920x1080_compressed.webm"
    
    # MP4 1080p
    ffmpeg -i "$input_file" \
        -vf scale=1920:1080 -c:v libx264 -preset slow -crf 25 \
        -c:a aac -b:a 96k -movflags +faststart -an \
        -y "${output_base}_1920x1080_compressed.mp4"
    
    # Poster image
    ffmpeg -i "$input_file" \
        -ss 00:00:05 -vframes 1 -f webp -quality 85 \
        -y "${theme_type}_theme_poster.webp"
}

# Process videos
compress_video "dark_theme_original.mp4" "1659171_Trapcode_Particles_3840x2160" "dark"
compress_video "light_theme_original.mp4" "0_Technology_Abstract_4096x2304" "light"

# Upload to S3 with proper metadata
echo "📤 Uploading compressed videos..."
for file in *.webm *.mp4 *.webp; do
    if [[ $file == *.webm ]]; then
        aws s3 cp "$file" s3://medhdocuments/Website/ \
            --content-type "video/webm" \
            --cache-control "max-age=31536000"
    elif [[ $file == *.mp4 ]]; then
        aws s3 cp "$file" s3://medhdocuments/Website/ \
            --content-type "video/mp4" \
            --cache-control "max-age=31536000"
    elif [[ $file == *.webp ]]; then
        aws s3 cp "$file" s3://medhdocuments/Website/ \
            --content-type "image/webp" \
            --cache-control "max-age=31536000"
    fi
done

echo "✅ Video compression completed!"
ls -lh *.webm *.mp4 *.webp
EOF

log "Docker container setup complete. Next steps:"
echo ""
echo "To use AWS Batch (recommended for cost efficiency):"
echo "1. Build and push the Docker image to ECR"
echo "2. Create AWS Batch job definition"
echo "3. Submit job"
echo ""
echo "Or run the EC2 workflow directly:"
echo "chmod +x aws-video-compression-workflow.sh"
echo "./aws-video-compression-workflow.sh"
echo ""
echo -e "${YELLOW}⚠️  EC2 workflow will cost ~$2-5 for processing time${NC}"
echo -e "${YELLOW}⚠️  AWS Batch is more cost-effective for one-time jobs${NC}" 