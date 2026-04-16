-- Replace RESOLVED with ACCEPTED and add REJECTED to complaint_status enum
ALTER TYPE "complaint_status" RENAME VALUE 'RESOLVED' TO 'ACCEPTED';
ALTER TYPE "complaint_status" ADD VALUE 'REJECTED';
