/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FileUtils.h"
#include "nsIFile.h"
#include "nsISimpleEnumerator.h"
#include "Filesystem.h"
#include "Directory.h"
#include "nsAutoPtr.h"
#include "PathManager.h"

namespace mozilla {
namespace dom {
namespace filesystem {

// static
nsresult
FileUtils::GetFileInfo(const nsAString& aPath, FileInfo& aInfo)
{
  // Get file from path.
  nsCOMPtr<nsIFile> file;
  nsresult rv = NS_NewLocalFile(aPath, false, getter_AddRefs(file));
  if (NS_FAILED(rv) ) {
    return rv;
  }

  return FileUtils::GetFileInfo(file, aInfo);
}

// static
nsresult
FileUtils::GetFileInfo(nsIFile* aFile, FileInfo& aInfo)
{
  // If file doesn't exist, the rest is unnecessary
  nsresult rv = aFile->Exists(&(aInfo.exists));
  if (NS_FAILED(rv) || !aInfo.exists) {
    return rv;
  }

  // Get isDirectory.
  rv = aFile->IsDirectory(&(aInfo.isDirectory));
  if (NS_FAILED(rv)) {
    return rv;
  }

  // Get isFile
  rv = aFile->IsFile(&(aInfo.isFile));
  if (NS_FAILED(rv)) {
    return rv;
  }

  // Get realPath
  rv = aFile->GetPath(aInfo.realPath);
  if (NS_FAILED(rv)) {
    return rv;
  }

   // Get name
  rv = aFile->GetLeafName(aInfo.name);
  if (NS_FAILED(rv)) {
    return rv;
  }

  return rv;
}

// static
Directory*
FileUtils::CreateDirectory(Filesystem* aFilesystem, const nsAString& aRealPath, const nsAString& aName)
{
  nsRefPtr<PathManager> p = aFilesystem->GetPathManager();

  if (p->WithinBase(aRealPath)) {
    nsString path;
    p->RealPathToDOMPath(aRealPath, path);
    return new Directory(aFilesystem, path, aName);
  }

  return nullptr;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
