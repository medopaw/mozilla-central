/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FileUtils.h"
#include "nsIFile.h"
#include "nsISimpleEnumerator.h"

namespace mozilla {
namespace dom {
namespace filesystem {

nsresult
FileUtils::IsDirectoryEmpty(nsIFile* aDir, bool* aEmpty)
{
  nsCOMPtr<nsISimpleEnumerator> childEnumerator;
  nsresult rv = aDir->GetDirectoryEntries(getter_AddRefs(childEnumerator));
  if (NS_SUCCEEDED(rv) ) {
    bool hasElements;
    rv = childEnumerator->HasMoreElements(&hasElements);
    *aEmpty = !hasElements;
  }
  return rv;
}

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

nsresult
FileUtils::GetFileInfo(nsIFile* aFile, FileInfo& aInfo)
{
  // If file not exists, the rest is unnecessary
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

  // Get relpath
  rv = aFile->GetPath(aInfo.relpath);
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

} // namespace filesystem
} // namespace dom
} // namespace mozilla
