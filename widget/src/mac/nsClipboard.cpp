/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 *
 * The contents of this file are subject to the Netscape Public License
 * Version 1.0 (the "NPL"); you may not use this file except in
 * compliance with the NPL.  You may obtain a copy of the NPL at
 * http://www.mozilla.org/NPL/
 *
 * Software distributed under the NPL is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the NPL
 * for the specific language governing rights and limitations under the
 * NPL.
 *
 * The Initial Developer of this code under the NPL is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1998 Netscape Communications Corporation.  All Rights
 * Reserved.
 */

//
// Mike Pinkerton
// Netscape Communications
//
// See header file for details.
//
// Remaining Work:
// * only convert data to clipboard on an app switch.
// * better mime type --> OS type conversion needed. Only a few formats supported now.
//

#include "nsCOMPtr.h"
#include "nsClipboard.h"

#include "nsVoidArray.h"
#include "nsIClipboardOwner.h"
#include "nsString.h"
#include "nsIFormatConverter.h"
#include "nsMimeMapper.h"

#include "nsIComponentManager.h"
#include "nsWidgetsCID.h"

#include <Scrap.h>


NS_IMPL_ADDREF_INHERITED(nsClipboard, nsBaseClipboard)
NS_IMPL_RELEASE_INHERITED(nsClipboard, nsBaseClipboard)

//
// nsClipboard constructor
//
nsClipboard::nsClipboard() : nsBaseClipboard()
{
}

//
// nsClipboard destructor
//
nsClipboard::~nsClipboard()
{
}



/**
 * @param aIID The name of the class implementing the method
 * @param _classiiddef The name of the #define symbol that defines the IID
 * for the class (e.g. NS_ISUPPORTS_IID)
 * 
*/ 
nsresult nsClipboard::QueryInterface(const nsIID& aIID, void** aInstancePtr)
{

  if (NULL == aInstancePtr) {
    return NS_ERROR_NULL_POINTER;
  }

  nsresult rv = NS_NOINTERFACE;

  static NS_DEFINE_IID(kIClipboard, NS_ICLIPBOARD_IID);
  if (aIID.Equals(kIClipboard)) {
    *aInstancePtr = (void*) ((nsIClipboard*)this);
    NS_ADDREF_THIS();
    return NS_OK;
  }

  return rv;
}


//
// SetNativeClipboardData
//
// Take data off the transferrable and put it on the clipboard in as many formats
// as are registered.
//
// NOTE: This code could all live in ForceDataToClipboard() and this could be a NOOP. 
// If speed and large data sizes are an issue, we should move that code there and only
// do it on an app switch.
//
NS_IMETHODIMP
nsClipboard :: SetNativeClipboardData()
{
  nsresult errCode = NS_OK;
  
  mIgnoreEmptyNotification = PR_TRUE;

  // make sure we have a good transferable
  if ( !mTransferable )
    return NS_ERROR_INVALID_ARG;
  
  nsMimeMapperMac theMapper;
  ::ZeroScrap();
  
  // get flavor list that includes all flavors that can be written (including ones 
  // obtained through conversion)
  nsVoidArray * flavorList;
  errCode = mTransferable->FlavorsTransferableCanExport ( &flavorList );
  if ( errCode != NS_OK )
    return NS_ERROR_FAILURE;

  // For each flavor present (either directly in the transferable or that its
  // converter knows about) put it on the clipboard. Luckily, GetTransferData() 
  // handles conversions for us, so we really don't need to know if a conversion
  // is required or not.
  PRUint32 cnt = flavorList->Count();
  for ( int i = 0; i < cnt; ++i ) {
    nsString * currentFlavor = (nsString *)flavorList->ElementAt(i);
    if ( nsnull != currentFlavor ) {
      // find MacOS flavor
      ResType macOSFlavor = theMapper.MapMimeTypeToMacOSType(*currentFlavor);
    
      // get data. This takes converters into account. We don't own the data
      // so make sure not to delete it.
      void* data = nsnull;
      PRUint32 dataSize = 0;
      errCode = mTransferable->GetTransferData ( currentFlavor, &data, &dataSize );
      #ifdef NS_DEBUG
        if ( errCode != NS_OK ) printf("nsClipboard:: Error getting data from transferable\n");
      #endif
      
      // stash on clipboard
      long numBytes = ::PutScrap ( dataSize, macOSFlavor, data );
      if ( numBytes != dataSize )
        errCode = NS_ERROR_FAILURE;
    }
  } // foreach flavor in transferable
  delete flavorList;

  // write out the mapping data in a special flavor on the clipboard
  short mappingLen = 0;
  const char* mapping = theMapper.ExportMapping(&mappingLen);
  long numBytes = ::PutScrap ( mappingLen, nsMimeMapperMac::MappingFlavor(), mapping );
  if ( numBytes != mappingLen )
    errCode = NS_ERROR_FAILURE;
  delete [] mapping;
  
  return errCode;
  
} // SetNativeClipboardData


//
// GetNativeClipboardData
//
// Take data off the native clip and put it on the transferable.
//
NS_IMETHODIMP
nsClipboard :: GetNativeClipboardData(nsITransferable * aTransferable)
{
  nsresult errCode = NS_OK;

  // make sure we have a good transferable
  if ( !aTransferable )
    return NS_ERROR_INVALID_ARG;

  // get flavor list that includes all acceptable flavors (including ones obtained through
  // conversion)
  nsVoidArray * flavorList;
  errCode = aTransferable->FlavorsTransferableCanImport ( &flavorList );
  if ( NS_FAILED(errCode) )
    return NS_ERROR_FAILURE;

  // create a mime mapper. It's ok for this to fail because the data may come from
  // another app which obviously wouldn't put our mime mapping data on the clipboard.
  char* mimeMapperData = nsnull;
  GetDataOffClipboard ( nsMimeMapperMac::MappingFlavor(), &mimeMapperData, nsnull );
  nsMimeMapperMac theMapper ( mimeMapperData );
  delete [] mimeMapperData;
  
  // 
  // Now walk down the list of flavors. When we find one that is actually on the
  // clipboard, copy out the data into the transferable in that format. SetTransferData()
  // implicitly handles conversions.
  PRUint32 cnt = flavorList->Count();
  for ( int i = 0; i < cnt; ++i ) {
    nsString * currentFlavor = (nsString *)flavorList->ElementAt(i);
    if ( nsnull != currentFlavor ) {
      // find MacOS flavor
      ResType macOSFlavor = theMapper.MapMimeTypeToMacOSType(*currentFlavor);
    
      char* clipboardData = nsnull;
      long dataSize = 0L;
      nsresult loadResult = GetDataOffClipboard ( macOSFlavor, &clipboardData, &dataSize );
      if ( NS_SUCCEEDED(loadResult) && clipboardData ) {
        // put it into the transferable
        errCode = aTransferable->SetTransferData ( currentFlavor, clipboardData, dataSize );
        #ifdef NS_DEBUG
          if ( errCode != NS_OK ) printf("nsClipboard:: Error setting data into transferable\n");
        #endif

        // we found one, get out of this loop!
        break;        
      } // if flavor found on clipboard
    }
  } // foreach flavor
  delete flavorList;
  
  return errCode;
}


//
// GetDataOffClipboard
//
// 
nsresult
nsClipboard :: GetDataOffClipboard ( ResType inMacFlavor, char** outData, long* outDataSize )
{
  if ( !outData )
    return NS_ERROR_FAILURE;

  // check if it is on the clipboard
  long offsetUnused;
  if ( ::GetScrap(NULL, inMacFlavor, &offsetUnused) > 0 ) {
    // we have it, get it off the clipboard. Put it into memory that we allocate
    // with new[] so that the tranferable can own it (and then later use delete[]
    // on it).
    Handle dataHand = ::NewHandle(0);
    if ( !dataHand )
      return NS_ERROR_OUT_OF_MEMORY;
    long dataSize = ::GetScrap ( dataHand, inMacFlavor, &offsetUnused );
    if ( dataSize > 0 ) {
      char* dataBuff = new char[dataSize];
      if ( !dataBuff )
        return NS_ERROR_OUT_OF_MEMORY;
      ::HLock(dataHand);
      ::BlockMoveData ( *dataHand, dataBuff, dataSize );
      ::HUnlock(dataHand);
      
      ::DisposeHandle(dataHand);
      
      if ( outDataSize )
        *outDataSize = dataSize;
      *outData = dataBuff;
    } 
    else {
       #ifdef NS_DEBUG
         printf("nsClipboard: Error getting data off the clipboard, #%d\n", dataSize);
       #endif
       return NS_ERROR_FAILURE;
    }
  }
  
  return NS_OK;
  
} // GetDataOffClipboard