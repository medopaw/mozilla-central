/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FileUtils.h"
#include "nsISimpleEnumerator.h"
#include "Path.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

unsigned long
FileUtils::GetType(bool isFile)
{
  SDCARD_LOG("in FileUtils.GetType() with isFile=%d", isFile);
  return isFile ? nsIFile::NORMAL_FILE_TYPE : nsIFile::DIRECTORY_TYPE;
}

nsresult
FileUtils::IsDirectory(const nsAString& aPath, bool* aIsDirectory)
{
  SDCARD_LOG("in FileUtils.IsDirectory() with path=%s", NS_ConvertUTF16toUTF8(aPath).get());

  nsCOMPtr<nsIFile> file;
  nsresult rv = NS_NewLocalFile(aPath, false, getter_AddRefs(file));
  rv = file->IsDirectory(aIsDirectory);
  return rv;
}

nsresult
FileUtils::IsFile(const nsAString& aPath, bool* aIsFile)
{
  SDCARD_LOG("in FileUtils.IsFile() with path=%s", NS_ConvertUTF16toUTF8(aPath).get());

  nsCOMPtr<nsIFile> file;
  nsresult rv = NS_NewLocalFile(aPath, false, getter_AddRefs(file));
  rv = file->IsFile(aIsFile);
  return rv;
}

nsresult
FileUtils::Exists(const nsAString& aPath, bool* aExists)
{
  SDCARD_LOG("in FileUtils.Exists() with path=%s", NS_ConvertUTF16toUTF8(aPath).get());

  nsCOMPtr<nsIFile> file;
  nsresult rv = NS_NewLocalFile(aPath, false, getter_AddRefs(file));
  rv = file->Exists(aExists);
  return rv;
}

nsresult
FileUtils::IsDirectoryEmpty(nsIFile* aDir, bool* aEmpty)
{
  SDCARD_LOG("in FileUtils.IsDirectoryEmpty()");

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
  SDCARD_LOG("in FileUtils.GetFileInfo() with path=%s", NS_ConvertUTF16toUTF8(aPath).get());

  // Get file from path.
  nsCOMPtr<nsIFile> file;
  nsresult rv = NS_NewLocalFile(aPath, false, getter_AddRefs(file));
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Fail to create nsIFile from path.");
    return rv;
  }

  // Get isFile.
  rv = file->IsFile(&(aInfo.isFile));
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Fail to get isFile.");
    return rv;
  }
  SDCARD_LOG("isFile=%d", aInfo.isFile);

  // Get isDirectory.
  rv = file->IsDirectory(&(aInfo.isDirectory));
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Fail to get isDirectory.");
    return rv;
  }
  SDCARD_LOG("isDirectory=%d", aInfo.isDirectory);

  // Get name.
  file->GetLeafName(aInfo.name);
  rv = file->IsDirectory(&(aInfo.isDirectory));
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Fail to get isDirectory.");
    return rv;
  }
  SDCARD_LOG("name=%s", NS_ConvertUTF16toUTF8(aInfo.name).get());

  // Get fullPath.
  nsString relpath;
  rv = file->GetPath(relpath);
  if (NS_FAILED(rv) ) {
    SDCARD_LOG("Fail to get relpath.");
    return rv;
  }
  Path::RealPathToDOMPath(relpath, aInfo.fullPath);
  SDCARD_LOG("fullPath=%s", NS_ConvertUTF16toUTF8(aInfo.fullPath).get());

  return rv;
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
