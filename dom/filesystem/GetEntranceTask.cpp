/*
 * GetEntranceTask.cpp
 *
 *  Created on: Sep 30, 2013
 *      Author: yuan
 */

#include "GetEntranceTask.h"
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

GetEntranceTask::GetEntranceTask(Filesystem* aFs)
{
  mPromise = new Promise(aFs->GetWindow());
  mFilesystem = do_GetWeakReference(aFs);

  mTargetRealPath = NS_LITERAL_STRING("/sdcard");
  Start();
}

GetEntranceTask::GetEntranceTask(
  const FilesystemEntranceParams& aParam,
  FilesystemRequestParent* aParent)
  : TaskBase(aParent)
{
  mTargetRealPath = aParam.basePath();
  Start();
}

GetEntranceTask::~GetEntranceTask()
{
}

FilesystemParams
GetEntranceTask::GetRequestParams()
{
  return FilesystemEntranceParams(mTargetRealPath);
}

FilesystemResponseValue
GetEntranceTask::GetSuccessRequestResult()
{
  return DirectoryResponse(mTargetInfo.realPath, mTargetInfo.name);
}

void
GetEntranceTask::SetSuccessRequestResult(const FilesystemResponseValue& aValue)
{
  DirectoryResponse r = aValue;
  mTargetInfo.realPath = r.realPath();
  mTargetInfo.name = r.name();
}

void
GetEntranceTask::Work()
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

  if (!mTargetInfo.exists) {
    SetError(Error::DOM_ERROR_NOT_FOUND);
    return;
  }

  if (!mTargetInfo.isDirectory && !mTargetInfo.isFile) {
    SetError(Error::DOM_ERROR_TYPE_MISMATCH);
    return;
  }
}

void
GetEntranceTask::HandlerCallback()
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
    Optional<JS::Handle<JS::Value> > val(cx,
        OBJECT_TO_JSVAL(dir->WrapObject(cx, global)));
    mPromise->MaybeResolve(cx, val);
    return;
  }
  nsRefPtr<DOMError> domError = Error::GetDOMError(mErrorName);
  Optional<JS::Handle<JS::Value> > val(cx,
      OBJECT_TO_JSVAL(domError->WrapObject(cx, global)));
  mPromise->MaybeReject(cx, val);
}

already_AddRefed<Filesystem>
GetEntranceTask::GetFilesystem()
{
  nsCOMPtr<Filesystem> filesystem = do_QueryReferent(mFilesystem);
  return filesystem.forget();
}

}
}
}
