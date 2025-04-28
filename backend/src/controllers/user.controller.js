import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from '../models/user.model.js';
import {uploadOnCLoudinary} from '../utils/cloudinary.js';
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId)=>{
    try {
        const user = await User.findById(userId);
        
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave : false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating Access and Refresh tokens!! : \n"+error);
        
    }
}

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
    // if(fullName === ""){
    //     throw new ApiError(400,"Full Name is Required!!");
        
    // }
    if (
        [fullName,userName,email,password].some((field)=>field?.trim() === "")
    ) {
        throw new ApiError(402,"All fields are mandatory")
    }
    const existedUser =  await User.findOne({
        $or : [{ email },{ userName }]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists.");
        
    }
    const avatarLocalPath = req.files?.avatar[0]?.path ;
    // const coverimageLocalPath = req.files?.coverImage[0]?.path;
    let coverimageLocalPath;
    if (req.files &&  Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverimageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar = await uploadOnCLoudinary(avatarLocalPath);
    const coverImage = await uploadOnCLoudinary(coverimageLocalPath);

    // Check if avatar file is successfully uploaded to cloudinary
    if (!avatar) {
        throw new ApiError(400,"Avatar file is required")
    }

        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email,
            password,
            userName: userName.toLowerCase(),
        });


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

const loginUser = asyncHandler(async (req,res)=>{
    /* Todos:
    1. If given user exists check for password
    2. else redirect to register
    3. When logged in generate the Access token and Refresh token
    4. Send cookies 
    */
   const {userName,email,password}  = req.body;
   if (!(userName || email)) {
        throw new ApiError(404,"Username or Email is required!!")
   }
   const user =  await User.findOne({
    $or : [{ email },{ userName }]
   })
   if (!user) {
        throw new ApiError(404,"User Does not Exist!")
   }
   const isPasswordValid = await user.isPasswordCorrect(password);

   if (!isPasswordValid) {
     throw new ApiError(401,"Invalid User Credentials")
   }

   const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
   const options = {
    httpOnly : true,
    secure : true
   }
   return res
   .status(200)
   .cookie("accessToken",accessToken, options)
   .cookie("refreshToken",refreshToken, options)
   .json(
    new ApiResponse(
        200,
        {
            user : loggedInUser,
            accessToken,
            refreshToken
        },
        "User Logged In Successfully!"
    )
   )



})

const logoutUser = asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken : undefined
            }
        },
        {
            new : true
        }
    
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {},"User Logged Out"))

})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401,"Unauthorized Request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);
    
        if (!user) {
            throw new ApiError(401,"Invalid Refresh Token");
        }
        
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly : true,
            secure : true
        }
    
        const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(user._id);
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken , refreshToken},
                "Access Token refreshed..."
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async (req,res) => {
    const {oldPassword, newPassword, confirmPass} = req.body;

    if (!(newPassword === confirmPass)) {
        throw new ApiError(401, "Passwords doesn't match")
    }

    const user =  await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Password")
    }
    user.password = newPassword;
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json( new ApiResponse(
        200,
        {},
        "Pssword Changed Successfully"
    ))
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res.status(200)
    .json(new ApiResponse(
        200,
        req.user,
        " Current User fetched successfully!!"
    ))
})

const UpdateAccountDetails = asyncHandler(async (req,res)=>{
    const {newFullName, newEmail} = req.body;

    if (!newFullName || !newEmail) {
        throw new ApiError(401, "All fields are mandatory!")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullName : newFullName,
                email : newEmail
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, 
        user,
        "Account Details updated successfully!!"
    ))


    
})

const UpdateUserAvatar = asyncHandler( async (req,res)=>{
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCLoudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar in cloud")
    }


    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set : {
            avatar : avatar.url
        }},
        {new : true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,
        user,
        "Avatar Successfully Updated"
    ))
})

const UpdateUserCoverImage = asyncHandler( async (req,res)=>{
    const coverLocalPath = req.file?.path;
    if (!coverLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    const cover = await uploadOnCLoudinary(coverLocalPath);

    if (!cover.url) {
        throw new ApiError(400, "Error while uploading cover image in cloud")
    }


    const user = await User.findByIdAndUpdate(req.user?._id,
        { $set : {
            coverImage : cover.url
        }},
        {new : true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,
        user,
        "Cover Image Successfully Updated"
    ))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    UpdateAccountDetails,
    UpdateUserAvatar,
    UpdateUserCoverImage
    
};