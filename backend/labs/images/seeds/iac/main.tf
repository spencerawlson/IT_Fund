terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.31.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "assets" {
  bucket = "globomantics-app-assets"
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Allow web and admin access"

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "app" {
  ami                    = "ami-0abcd1234ef567890"
  instance_type          = "t3.micro"
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "globomantics-app"
  }
}

# --- Road to CISSP lab stanza: offline-friendly provider settings ---
# The sandbox has no internet egress, so the AWS provider is told to skip
# credential/account validation. Dummy credentials come from the environment
# (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY). `terraform init` uses the
# pre-seeded plugin mirror; `tfsec`, `validate` and `plan` run fully offline.
# `apply` needs real AWS credentials and network, and is out of scope here.
provider "aws" {
  region                      = "us-east-1"
  access_key                  = "lab"
  secret_key                  = "lab"
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
}
