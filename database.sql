-- database.sql - MediCare HMS Database Schema & Seed Data
-- Database: medicare_hms

SET FOREIGN_KEY_CHECKS = 0;
-- Hosted MySQL migration: intentionally skipped: DROP DATABASE IF EXISTS `medicare_hms`;
-- Hosted MySQL migration: intentionally skipped: CREATE DATABASE `medicare_hms` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Hosted MySQL migration: intentionally skipped: USE `medicare_hms`;

-- --------------------------------------------------------
-- Table: users
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) UNIQUE NOT NULL,
  `age` INT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'staff', 'patient') NOT NULL DEFAULT 'patient',
  `photo` LONGTEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_login` DATETIME NULL,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: doctors
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `doctors`;
CREATE TABLE IF NOT EXISTS `doctors` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `specialization` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `available_days` VARCHAR(100) NOT NULL DEFAULT 'Mon-Fri',
  `available_time` VARCHAR(100) NOT NULL DEFAULT '09:00 - 13:00',
  `consultation_fee` DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  `status` ENUM('Active', 'On Leave', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_doc_spec` (`specialization`),
  INDEX `idx_doc_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: patients
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `patients`;
CREATE TABLE IF NOT EXISTS `patients` (
  `id` VARCHAR(20) PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `age` INT NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Male',
  `dob` DATE NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `blood` VARCHAR(10) NULL,
  `doctor_id` VARCHAR(20) NULL,
  `doctor_name` VARCHAR(100) NULL,
  `notes` TEXT NULL,
  `status` ENUM('Admitted', 'Outpatient', 'Discharged') NOT NULL DEFAULT 'Outpatient',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_patient_status` (`status`),
  INDEX `idx_patient_phone` (`phone`),
  CONSTRAINT `fk_patient_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: appointments
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `appointments`;
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` VARCHAR(20) PRIMARY KEY,
  `patient_id` VARCHAR(20) NULL,
  `doctor_id` VARCHAR(20) NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `age` INT NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') NOT NULL DEFAULT 'Male',
  `email` VARCHAR(100) NOT NULL,
  `problem` VARCHAR(255) NOT NULL,
  `doctor_name` VARCHAR(100) NULL,
  `department` VARCHAR(100) NULL,
  `fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `appointment_date` DATE NOT NULL,
  `time_slot` VARCHAR(50) NOT NULL,
  `payment_mode` VARCHAR(50) NOT NULL DEFAULT 'Cash Only',
  `notes` TEXT NULL,
  `status` ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_appt_date` (`appointment_date`),
  INDEX `idx_appt_status` (`status`),
  CONSTRAINT `fk_appt_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_appt_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: invoices
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `invoices`;
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(20) PRIMARY KEY,
  `patient_id` VARCHAR(20) NULL,
  `appointment_id` VARCHAR(20) NULL,
  `invoice_number` VARCHAR(50) NOT NULL,
  `invoice_date` DATE NOT NULL,
  `patient_name` VARCHAR(100) NOT NULL,
  `consultation_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `other_charges` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('Paid', 'Pending') NOT NULL DEFAULT 'Pending',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_invoice_status` (`status`),
  INDEX `idx_invoice_date` (`invoice_date`),
  CONSTRAINT `fk_invoice_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: staff
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `staff`;
CREATE TABLE IF NOT EXISTS `staff` (
  `id` VARCHAR(20) PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `role` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `username` VARCHAR(50) NULL,
  `status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_staff_status` (`status`),
  INDEX `idx_staff_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: contacts
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `contacts`;
CREATE TABLE IF NOT EXISTS `contacts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table: password_resets
-- --------------------------------------------------------
-- Hosted MySQL migration: intentionally skipped: DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(100) NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_reset_token` (`token`),
  INDEX `idx_reset_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- Seed Default Admin Account (password: admin123)
-- --------------------------------------------------------
INSERT INTO `users` (`id`, `username`, `full_name`, `email`, `age`, `password`, `role`, `created_at`)
VALUES (1, 'admin', 'Dr. Admin', 'admin@medicare.in', 45, '$2y$10$k8MpZI2/gGGfzzBsFsVvCe7iSU7TadqrVoHuW3Su1.DU5Nqkam7UW', 'admin', '2025-03-03 09:00:00')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- --------------------------------------------------------
-- Seed Doctors
-- --------------------------------------------------------
INSERT INTO `doctors` (`id`, `name`, `specialization`, `phone`, `email`, `available_days`, `available_time`, `consultation_fee`, `status`) VALUES
('D001', 'Dr. Anil Sharma', 'Cardiology', '9876543210', 'anil@medicare.in', 'Mon-Fri', '09:00 - 13:00', 900.00, 'Active'),
('D002', 'Dr. Priya Nair', 'Pediatrics', '9876501234', 'priya@medicare.in', 'Mon-Sat', '10:00 - 14:00', 600.00, 'Active'),
('D003', 'Dr. Rakesh Verma', 'Orthopedics', '9812345678', 'rakesh@medicare.in', 'Tue-Sat', '11:00 - 15:00', 800.00, 'Active'),
('D004', 'Dr. Sneha Iyer', 'Dermatology', '9900112233', 'sneha@medicare.in', 'Mon-Thu', '09:30 - 13:30', 700.00, 'Active'),
('D005', 'Dr. Vikram Chatterjee', 'Neurology', '9845123456', 'vikram@medicare.in', 'Mon-Fri', '14:00 - 18:00', 1500.00, 'Active'),
('D006', 'Dr. Ritu Bhatia', 'Gynecology', '9922334455', 'ritu@medicare.in', 'Mon-Sat', '10:30 - 14:30', 900.00, 'Active'),
('D007', 'Dr. Suresh Pillai', 'ENT (Ear, Nose & Throat)', '9788112233', 'suresh@medicare.in', 'Mon-Fri', '12:00 - 16:00', 650.00, 'Active'),
('D008', 'Dr. Neha Kapoor', 'Dentistry', '9911223300', 'neha@medicare.in', 'Tue-Sun', '13:00 - 17:00', 500.00, 'Active'),
('D009', 'Dr. Arvind Menon', 'Ophthalmology', '9845098450', 'arvind@medicare.in', 'Mon-Fri', '08:00 - 12:00', 750.00, 'Active'),
('D010', 'Dr. Kavya Reddy', 'Psychiatry', '9900776655', 'kavya@medicare.in', 'Mon-Fri', '15:00 - 19:00', 1200.00, 'Active'),
('D011', 'Dr. Manoj Tiwari', 'General Medicine', '9876123450', 'manoj@medicare.in', 'Mon-Sun', '16:00 - 20:00', 550.00, 'Active'),
('D012', 'Dr. Zara Ahmed', 'Urology', '9812098120', 'zara@medicare.in', 'Mon-Fri', '17:00 - 21:00', 1000.00, 'Active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- --------------------------------------------------------
-- Seed Patients
-- --------------------------------------------------------
INSERT INTO `patients` (`id`, `full_name`, `age`, `gender`, `dob`, `phone`, `address`, `blood`, `doctor_id`, `doctor_name`, `notes`, `status`) VALUES
('P001', 'Ravi Kumar', 34, 'Male', '1992-03-11', '9871112223', 'Sector 12, Delhi', 'B+', 'D001', 'Dr. Anil Sharma', 'Chest pain, high BP', 'Admitted'),
('P002', 'Meena Joshi', 28, 'Female', '1998-07-22', '9812223334', 'Andheri, Mumbai', 'O+', 'D004', 'Dr. Sneha Iyer', 'Skin allergy', 'Outpatient'),
('P003', 'Arjun Das', 9, 'Male', '2017-01-05', '9765432100', 'Salt Lake, Kolkata', 'A+', 'D002', 'Dr. Priya Nair', 'Fever and cough', 'Outpatient'),
('P004', 'Sunita Rao', 52, 'Female', '1974-11-19', '9911223344', 'Jayanagar, Bengaluru', 'AB+', 'D003', 'Dr. Rakesh Verma', 'Knee pain, physiotherapy', 'Discharged'),
('P005', 'Imran Sheikh', 41, 'Male', '1985-05-30', '9700088111', 'Charminar, Hyderabad', 'B-', 'D001', 'Dr. Anil Sharma', 'Routine cardiac check-up', 'Admitted')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- --------------------------------------------------------
-- Seed Appointments
-- --------------------------------------------------------
INSERT INTO `appointments` (`id`, `patient_id`, `doctor_id`, `full_name`, `age`, `gender`, `email`, `problem`, `doctor_name`, `department`, `fee`, `appointment_date`, `time_slot`, `payment_mode`, `notes`, `status`) VALUES
('A001', 'P001', 'D001', 'Ravi Kumar', 34, 'Male', 'ravi.kumar@example.com', 'Chest pain / Heart issues', 'Dr. Anil Sharma', 'Cardiology', 900.00, CURDATE(), '10:00 - 11:00', 'Cash Only', 'Follow-up ECG', 'Scheduled'),
('A002', 'P003', 'D002', 'Arjun Das', 9, 'Male', 'arjun.parent@example.com', 'General checkup / Fever / Cold', 'Dr. Priya Nair', 'Pediatrics', 600.00, CURDATE(), '11:00 - 12:00', 'Cash Only', 'Fever check', 'Completed'),
('A003', 'P002', 'D004', 'Meena Joshi', 28, 'Female', 'meena.joshi@example.com', 'Skin rash / Allergy', 'Dr. Sneha Iyer', 'Dermatology', 700.00, CURDATE(), '12:00 - 13:00', 'Cash Only', 'Allergy review', 'Scheduled'),
('A004', 'P004', 'D003', 'Sunita Rao', 52, 'Female', 'sunita.rao@example.com', 'Bone / Joint / Fracture pain', 'Dr. Rakesh Verma', 'Orthopedics', 800.00, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '09:00 - 10:00', 'Cash Only', 'X-ray report', 'Cancelled')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- --------------------------------------------------------
-- Seed Invoices
-- --------------------------------------------------------
INSERT INTO `invoices` (`id`, `patient_id`, `appointment_id`, `invoice_number`, `invoice_date`, `patient_name`, `consultation_fee`, `other_charges`, `total_amount`, `status`) VALUES
('INV001', 'P001', 'A001', 'INV001', CURDATE(), 'Ravi Kumar', 800.00, 2500.00, 3300.00, 'Paid'),
('INV002', 'P002', 'A003', 'INV002', CURDATE(), 'Meena Joshi', 600.00, 400.00, 1000.00, 'Pending'),
('INV003', 'P003', 'A002', 'INV003', DATE_SUB(CURDATE(), INTERVAL 7 DAY), 'Arjun Das', 500.00, 750.00, 1250.00, 'Paid'),
('INV004', 'P004', 'A004', 'INV004', DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'Sunita Rao', 900.00, 4200.00, 5100.00, 'Pending')
ON DUPLICATE KEY UPDATE `patient_name` = VALUES(`patient_name`);

-- --------------------------------------------------------
-- Seed Staff
-- --------------------------------------------------------
INSERT INTO `staff` (`id`, `name`, `role`, `phone`, `email`, `status`) VALUES
('S001', 'Kavita Menon', 'Head Nurse', '9822001100', 'kavita@medicare.in', 'Active'),
('S002', 'Ramesh Yadav', 'Lab Technician', '9822334455', 'ramesh@medicare.in', 'Active'),
('S003', 'Fatima Khan', 'Receptionist', '9833445566', 'fatima@medicare.in', 'Inactive'),
('S004', 'John Mathew', 'Pharmacist', '9844556677', 'john@medicare.in', 'Active'),
('S005', 'Anita Desai', 'Accountant', '9855667788', 'anita@medicare.in', 'Active'),
('S006', 'Vikram Singh', 'Security Guard', '9866778899', 'vikram@medicare.in', 'Active'),
('S007', 'Priya Sharma', 'Housekeeping', '9877889900', 'priya@medicare.in', 'Active'),
('S008', 'Amitabh Joshi', 'IT Support', '9888990011', 'amitabh@medicare.in', 'Inactive'),
('S009', 'Sunil Kumar', 'Driver', '9899001122', 'sunil@medicare.in', 'Active'),
('S010', 'Rekha Nair', 'Dietician', '9900112233', 'rekha@medicare.in', 'Active')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
