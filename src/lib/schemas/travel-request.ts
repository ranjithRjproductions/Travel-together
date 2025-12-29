import { z } from 'zod';

//=========== STEP 1 SCHEMA ===========//
export const step1Schema = z.object({
  purpose: z.enum(['education', 'hospital', 'shopping'], {
    required_error: 'You must select a purpose for your trip.',
  }),
  subPurposeData: z.object({
    // Education
    subPurpose: z.enum(['scribe', 'admission']).optional(),
    collegeName: z.string().optional(),
    collegeAddress: z.object({
      street: z.string().optional(),
      district: z.string().optional(),
      pincode: z.string().optional(),
    }).optional(),
    scribeSubjects: z.array(z.string()).optional(),

    // Hospital
    hospitalName: z.string().optional(),
    hospitalAddress: z.object({
      street: z.string().optional(),
      district: z.string().optional(),
      pincode: z.string().optional(),
    }).optional(),
    bookingDetails: z.object({
      isAppointmentPrebooked: z.enum(['yes', 'no']).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      visitingTime: z.string().optional(),
    }).optional(),

    // Shopping
    shopType: z.enum(['particular', 'area']).optional(),
    shopName: z.string().optional(), // Added for particular shop
    shopAddress: z.object({
      street: z.string().optional(),
      district: z.string().optional(),
      pincode: z.string().optional(), // Added pincode for particular shop
    }).optional(),
    shoppingArea: z.object({
      area: z.string().optional(),
      district: z.string().optional(),
    }).optional(),
    agreeNotToCarry: z.boolean().optional(),
  }),
}).superRefine((data, ctx) => {
    const { purpose, subPurposeData } = data;
    if (purpose === 'education') {
        if (!subPurposeData.subPurpose) {
            ctx.addIssue({ code: 'custom', message: 'Please select a support type.', path: ['subPurposeData.subPurpose'] });
        }
        if (subPurposeData.subPurpose) {
            if (!subPurposeData.collegeName) ctx.addIssue({ code: 'custom', message: 'College name is required.', path: ['subPurposeData.collegeName'] });
            if (!subPurposeData.collegeAddress?.street) ctx.addIssue({ code: 'custom', message: 'Street address is required.', path: ['subPurposeData.collegeAddress.street'] });
            if (!subPurposeData.collegeAddress?.district) ctx.addIssue({ code: 'custom', message: 'District is required.', path: ['subPurposeData.collegeAddress.district'] });
            if (!subPurposeData.collegeAddress?.pincode) ctx.addIssue({ code: 'custom', message: 'Pincode is required.', path: ['subPurposeData.collegeAddress.pincode'] });
        }
        if (subPurposeData.subPurpose === 'scribe' && (!subPurposeData.scribeSubjects || subPurposeData.scribeSubjects.length === 0)) {
            ctx.addIssue({ code: 'custom', message: 'Please select at least one subject.', path: ['subPurposeData.scribeSubjects'] });
        }
    } else if (purpose === 'hospital') {
        if (!subPurposeData.hospitalName) ctx.addIssue({ code: 'custom', message: 'Hospital name is required.', path: ['subPurposeData.hospitalName'] });
        if (!subPurposeData.hospitalAddress?.street) ctx.addIssue({ code: 'custom', message: 'Street address is required.', path: ['subPurposeData.hospitalAddress.street'] });
        if (!subPurposeData.hospitalAddress?.district) ctx.addIssue({ code: 'custom', message: 'District is required.', path: ['subPurposeData.hospitalAddress.district'] });
        if (!subPurposeData.hospitalAddress?.pincode) ctx.addIssue({ code: 'custom', message: 'Pincode is required.', path: ['subPurposeData.hospitalAddress.pincode'] });
        if (!subPurposeData.bookingDetails?.isAppointmentPrebooked) ctx.addIssue({ code: 'custom', message: 'Please specify if your appointment is pre-booked.', path: ['subPurposeData.bookingDetails.isAppointmentPrebooked'] });
        if (subPurposeData.bookingDetails?.isAppointmentPrebooked === 'yes') {
            if (!subPurposeData.bookingDetails.startTime) ctx.addIssue({ code: 'custom', message: 'Start time is required.', path: ['subPurposeData.bookingDetails.startTime'] });
            if (!subPurposeData.bookingDetails.endTime) ctx.addIssue({ code: 'custom', message: 'End time is required.', path: ['subPurposeData.bookingDetails.endTime'] });
        }
        if (subPurposeData.bookingDetails?.isAppointmentPrebooked === 'no' && !subPurposeData.bookingDetails.visitingTime) {
            ctx.addIssue({ code: 'custom', message: 'Please provide a preferred visiting time.', path: ['subPurposeData.bookingDetails.visitingTime'] });
        }
    } else if (purpose === 'shopping') {
        if (!subPurposeData.shopType) ctx.addIssue({ code: 'custom', message: 'Please select a shopping type.', path: ['subPurposeData.shopType'] });
        if (subPurposeData.shopType === 'particular') {
            if (!subPurposeData.shopName) ctx.addIssue({ code: 'custom', message: 'Shop name is required.', path: ['subPurposeData.shopName'] });
            if (!subPurposeData.shopAddress?.street) ctx.addIssue({ code: 'custom', message: 'Street address is required.', path: ['subPurposeData.shopAddress.street'] });
            if (!subPurposeData.shopAddress?.district) ctx.addIssue({ code: 'custom', message: 'District is required.', path: ['subPurposeData.shopAddress.district'] });
            if (!subPurposeData.shopAddress?.pincode) ctx.addIssue({ code: 'custom', message: 'Pincode is required.', path: ['subPurposeData.shopAddress.pincode'] });
        }
        if (subPurposeData.shopType === 'area') {
            if (!subPurposeData.shoppingArea?.area) ctx.addIssue({ code: 'custom', message: 'Area name is required.', path: ['subPurposeData.shoppingArea.area'] });
            if (!subPurposeData.shoppingArea?.district) ctx.addIssue({ code: 'custom', message: 'District is required.', path: ['subPurposeData.shoppingArea.district'] });
        }
        if (!subPurposeData.agreeNotToCarry) {
          ctx.addIssue({
            code: 'custom',
            message: 'You must agree that you will not ask the guide to carry your things.',
            path: ['subPurposeData.agreeNotToCarry'],
          });
        }
    }
});
export type Step1FormValues = z.infer<typeof step1Schema>;


//=========== STEP 2 SCHEMA ===========//
export const step2Schema = z.object({
  requestedDate: z.date({ required_error: "A date of trip is required." }),
  startTime: z.string().min(1, 'Start time is required.'),
  endTime: z.string().min(1, 'End time is required.'),
}).refine(data => {
    if (data.startTime && data.endTime) {
        return data.endTime > data.startTime;
    }
    return true;
}, {
    message: 'End time must be after start time.',
    path: ['endTime']
});
export type Step2FormValues = z.infer<typeof step2Schema>;


//=========== STEP 3 SCHEMA ===========//
export const step3Schema = z.object({
    travelMedium: z.enum(['car', 'bus', 'train', 'flight'], { required_error: 'Please select a travel medium.'}),
    isTicketPrebooked: z.enum(['yes', 'no']).optional(),
    vehicleInfo: z.object({
      busName: z.string().optional(),
      busNumber: z.string().optional(),
      trainName: z.string().optional(),
      trainNumber: z.string().optional(),
      flightNumber: z.string().optional(),
    }).optional(),
    time: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.travelMedium !== 'car') {
        if (!data.isTicketPrebooked) {
             ctx.addIssue({ code: 'custom', message: 'Please specify if your ticket is pre-booked.', path: ['isTicketPrebooked'] });
        }
        if (data.isTicketPrebooked === 'yes') {
            if (!data.time) {
                ctx.addIssue({ code: 'custom', message: 'Arrival/Departure time is required.', path: ['time'] });
            }
            if (data.travelMedium === 'bus' && !data.vehicleInfo?.busName) {
                ctx.addIssue({ code: 'custom', message: 'Bus name is required.', path: ['vehicleInfo.busName'] });
            }
            if (data.travelMedium === 'train' && !data.vehicleInfo?.trainName) {
                ctx.addIssue({ code: 'custom', message: 'Train name is required.', path: ['vehicleInfo.trainName'] });
            }
             if (data.travelMedium === 'flight' && !data.vehicleInfo?.flightNumber) {
                ctx.addIssue({ code: 'custom', message: 'Flight number is required.', path: ['vehicleInfo.flightNumber'] });
            }
        }
    }
});
export type Step3FormValues = z.infer<typeof step3Schema>;

//=========== STEP 4 SCHEMA ===========//
export const step4Schema = z.object({
    pickupType: z.enum(['destination', 'hotel', 'bus_stand', 'railway_station', 'airport'], { required_error: 'Please select a meeting point.' }),
    hotelDetails: z.object({
        name: z.string().optional(),
        roomNumber: z.string().optional(),
    }).optional(),
    stationName: z.string().optional(),
    pickupTime: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.pickupType !== 'destination' && !data.pickupTime) {
        ctx.addIssue({ code: 'custom', message: 'Pickup time is required.', path: ['pickupTime'] });
    }
    if (data.pickupType === 'hotel' && !data.hotelDetails?.name) {
        ctx.addIssue({ code: 'custom', message: 'Hotel name is required.', path: ['hotelDetails.name'] });
    }
    if (['bus_stand', 'railway_station', 'airport'].includes(data.pickupType || '') && !data.stationName) {
         ctx.addIssue({ code: 'custom', message: 'Location name is required.', path: ['stationName'] });
    }
});
export type Step4FormValues = z.infer<typeof step4Schema>;
