/*
 * CreateDirectoryTask.cpp
 *
 *  Created on: Sep 30, 2013
 *      Author: yuan
 */

#include "CreateDirectoryTask.h"
#include "nsString.h"
#include "Filesystem.h"
#include "Directory.h"
#include "Error.h"
#include "FileUtils.h"
#include "nsIFile.h"
#include "FileUtils.h"

#include "mozilla/dom/Promise.h"
#include "mozilla/dom/PContent.h"

namespace mozilla {

namespace dom {

namespace filesystem {

CreateDirectoryTask::CreateDirectoryTask(
  Directory* aDir, const nsAString& aPath)
{
  nsRefPtr<Filesystem> f = aDir->GetFilesystem();
  mPromise = new Promise(f->GetWindow());
  mFilesystem = do_GetWeakReference(f);

  if (aDir->GetRealPath(aPath, mTargetRealPath)) {
    Start();
  } else {
    SetError(Error::DOM_ERROR_ENCODING);
    HandlerCallback();
  }
}

CreateDirectoryTask::CreateDirectoryTask(
  const FilesystemCreateDirectoryParams& aParam,
  FilesystemRequestParent* aParent)
  : TaskBase(aParent)
{
  mTargetRealPath = aParam.realPath();
  Start();
}

CreateDirectoryTask::~CreateDirectoryTask()
{
}

FilesystemParams
CreateDirectoryTask::GetRequestParams()
{
  return FilesystemEntranceParams(mTargetRealPath);
}

FilesystemResponseValue
CreateDirectoryTask::GetSuccessRequestResult()
{
  return DirectoryResponse(mTargetInfo.realPath, mTargetInfo.name);
}

void
CreateDirectoryTask::SetSuccessRequestResult(const FilesystemResponseValue& aValue)
{
  DirectoryResponse r = aValue;
  mTargetInfo.realPath = r.realPath();
  mTargetInfo.name = r.name();
}

void
CreateDirectoryTask::Work()
{
  // Resolve nsIFile from mTargetRealPath.
  nsCOMPtr<nsIFile> file;
  nsresult rv = NS_NewLocalFile(mTargetRealPath, false, getter_AddRefs(file));
  if (NS_FAILED(rv)) {
    SetError(rv);
    return;
  }

  rv = FileUtils::GetFileInfo(file, mTargetInfo);
  if (NS_FAILED(rv)) {
    SetError(rv);
    return;
  }

  if (mTargetInfo.exists) {
    SetError(Error::DOM_ERROR_PATH_EXISTS);
    return;
  }

  rv = file->Create(nsIFile::DIRECTORY_TYPE, CREATE_DIRECTORY_PERMISSION);
  if (NS_FAILED(rv)) {
    SetError(rv);
    return;
  }

  rv = FileUtils::GetFileInfo(file, mTargetInfo);
  if (NS_FAILED(rv)) {
    SetError(rv);
    return;
  }
}

void
CreateDirectoryTask::HandlerCallback()
{
  nsCOMPtr<Filesystem> filesystem = GetFilesystem();
  if (!filesystem) {
    return;
  }
  nsCOMPtr<nsIGlobalObject> globalObject = do_QueryInterface(
      filesystem->GetWindow());
  if (!globalObject) {
    return;
  }

  AutoSafeJSContext cx;
  JS::Rooted<JSObject*> global(cx, globalObject->GetGlobalJSObject());

  if (!HasError()) {
    nsRefPtr<Directory> dir = FileUtils::CreateDirectory(filesystem,
      mTargetInfo.realPath, mTargetInfo.name);
    if (dir) {
      Optional<JS::Handle<JS::Value> > val(cx,
          OBJECT_TO_JSVAL(dir->WrapObject(cx, global)));
      mPromise->MaybeResolve(cx, val);
      return;
    }
    mErrorName = Error::DOM_ERROR_SECURITY;
  }
  nsRefPtr<DOMError> domError = Error::GetDOMError(mErrorName);
  Optional<JS::Handle<JS::Value> > val(cx,
      OBJECT_TO_JSVAL(domError->WrapObject(cx, global)));
  mPromise->MaybeReject(cx, val);
}

already_AddRefed<Filesystem>
CreateDirectoryTask::GetFilesystem()
{
  nsCOMPtr<Filesystem> filesystem = do_QueryReferent(mFilesystem);
  return filesystem.forget();
}

}
}
}
