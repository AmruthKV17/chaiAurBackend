import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from '../models/user.model.js';
import {uploadOnCLoudinary} from '../utils/cloudinary.js';
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req,res)=>{
    // GEt user data from the frontend
    // VAlidation - not empty
    // check if user already exists : username and email
    // check for images and check for avatars
    // upload images to cloudinary, check avatar 
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    const {userName,email, fullName, password} = req.body
    console.log("password : ",password);
    // if(fullName === ""){
    //     throw new ApiError(400,"Full Name is Required!!");
        
    // }
    if (
        [fullName,userName,email,password].some((field)=>field?.trim() === "")
    ) {
        throw new ApiError(402,"All fields are mandatory")
    }
    const existedUser = User.findOne({
        $or : [{ email },{ userName }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists.");
        
    }
    const avatarLocalPath = req.files?.avatar[0]?.path ;
    const coverimageLocalPath = req.files?.coverimage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar = await uploadOnCLoudinary(avatarLocalPath);
    const coverImage = await uploadOnCLoudinary(coverimageLocalPath);

    // Check if avatar file is successfully uploaded to cloudinary
    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

    const user =  await User.create(
        {
            fullName,
            avatar : avatar.url,
            coverImage : coverImage?.url || "",
            email,
            password,
            userName : userName.toLowerCase()
        }
    )

    // Unselect password and refreshToken field
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully!")
    )

})

export {registerUser};