/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CopyAndMoveToWorker.h"
#include "FileUtils.h"
#include "Path.h"
#include "Error.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

CopyAndMoveToWorker::CopyAndMoveToWorker(const nsAString& aRelpath,
    const nsAString& aParentPath,
    const nsAString& aNewName,
    bool aIsCopy) :
    Worker(aRelpath),
    mParentPath(aParentPath),
    mNewName(aNewName),
    mIsCopy(aIsCopy)
{
  SDCARD_LOG("construct CopyAndMoveToWorker");
}

CopyAndMoveToWorker::~CopyAndMoveToWorker()
{
  SDCARD_LOG("destruct CopyAndMoveToWorker");
}

void
CopyAndMoveToWorker::Work()
{
  SDCARD_LOG("in CopyAndMoveToWorker.Work()");
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  if (Path::IsBase(mRelpath)) {
    // Cannot copy/move the root directory.
    SDCARD_LOG("Can't copy/move the root directory!");
    SetError(Error::DOM_ERROR_INVALID_MODIFICATION);
    return;
  }

  bool isFile = false;
  bool isDirectory = false;
  nsresult rv = mFile->IsFile(&isFile);
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Error occurs when getting isFile.");
    SetError(rv);
    return;
  }
  rv = mFile->IsDirectory(&isDirectory);
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Error occurs when getting isDirectory.");
    SetError(rv);
    return;
  }

  if (!(isFile || isDirectory)) {
    // Cannot copy/move a special file.
    SDCARD_LOG("mFile is neither a file nor a directory.");
    SetError(Error::DOM_ERROR_INVALID_MODIFICATION);
    return;
  }

  // If no new name specified, set it to the entry's current name.
  if (mNewName.IsVoid() || mNewName.IsEmpty()) {
    mNewName.SetIsVoid(false);
    rv = mFile->GetLeafName(mNewName);
    if (NS_FAILED(rv) ) {
      SDCARD_LOG("Error occurs when getting new name from path.");
      SetError(rv);
      return;
    }
  }

  if (!Path::IsValidName(mNewName)) {
    SDCARD_LOG("Invalid name!");
    SetError(Error::DOM_ERROR_ENCODING);
    return;
  }

  nsCOMPtr<nsIFile> parentDir;
  rv = NS_NewLocalFile(mParentPath, false, getter_AddRefs(parentDir));

  nsCOMPtr<nsIFile> resultFile;
  // Assign resultFile to target file.
  parentDir->Clone(getter_AddRefs(resultFile));
  rv = resultFile->Append(mNewName);
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Error occurs when append new name to mResultFile.");
    SetError(rv);
    return;
  }

  // Check if destination exists
  bool newFileExits = false;
  rv = resultFile->Exists(&newFileExits);
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Error occurs when checking if resultFile exists.");
    SetError(rv);
    return;
  }

  // Whether the destination is a file
  bool isNewFile = false;
  // Whether the destination is a directory
  bool isNewDirectory = false;
  if (newFileExits) {
    resultFile->IsFile(&isNewFile);
    resultFile->IsDirectory(&isNewDirectory);
    if (!(isNewFile || isNewDirectory)) {
      // Cannot overwrite a special file
      SDCARD_LOG("resultFile is neither a file nor directory.");
      SetError(Error::DOM_ERROR_INVALID_MODIFICATION);
      return;
    }
  }

  nsString newPath;
  resultFile->GetPath(newPath);

  // The destination is the same with the source
  if (mRelpath == newPath) {
    // Cannot copy/move an entry into its parent if a name different from its
    // current one isn't provided
    SDCARD_LOG(
        "Cannot copy/move an entry into its parent if a name different from its current one isn't provided.");
    SetError(Error::DOM_ERROR_INVALID_MODIFICATION);
    return;
  }

  if (isNewDirectory) {
    bool dirEmpty;
    rv = FileUtils::IsDirectoryEmpty(resultFile, &dirEmpty);
    if (NS_FAILED(rv) ) {
      SDCARD_LOG("Error occurs when checking if directory is empty.");
      SetError(rv);
      return;
    }
    if (!dirEmpty) {
      // Cannot copy/move to a path occupied by a directory which is not empty.
      SDCARD_LOG(
          "Cannot copy/move to a path occupied by a directory which is not empty.");
      SetError(Error::DOM_ERROR_INVALID_MODIFICATION);
      return;
    }
  }

  if ((isFile && isNewDirectory) || (isDirectory && isNewFile)) {
    // Cannot copy/move a file to a path occupied by a directory, or
    // copy/move a directory to a path occupied by a file
    SDCARD_LOG(
        "Cannot copy/move a file to a path occupied by a directory, or copy/move a directory to a path occupied by a file.");
    SetError(Error::DOM_ERROR_INVALID_MODIFICATION);
    return;
  }

  if (Path::IsParentOf(mRelpath, newPath)) {
    // Cannot copy/move a directory inside itself or to child at any depth.
    SDCARD_LOG(
        "Cannot copy/move a directory inside itself or to child at any depth.");
    SetError(Error::DOM_ERROR_INVALID_MODIFICATION);
    return;
  }

  // Delete the existing entry as nsIFile.coptTo()/moveTo() cannot be overwritten.
  if (newFileExits) {
    rv = resultFile->Remove(false);
    if (NS_FAILED(rv) ) {
      SDCARD_LOG("Fail to remove existing target before copy/move.");
      SetError(rv);
      return;
    }
  }

  // Actually copy/move the entry.
  if (mIsCopy) {
    rv = mFile->CopyTo(parentDir, mNewName);
  } else {
    rv = mFile->MoveTo(parentDir, mNewName);
  }
  if (NS_FAILED(rv) ) {
    // fail to copy/move
    SDCARD_LOG("Fail to copy/move.");
    SetError(rv);
    return;
  }

  resultFile->GetPath(mResultPath);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
