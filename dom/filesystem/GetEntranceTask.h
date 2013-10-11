/*
 * GetEntranceTask.h
 *
 *  Created on: Sep 30, 2013
 *      Author: yuan
 */

#ifndef mozilla_dom_getentrance_h__
#define mozilla_dom_getentrance_h__

#include "TaskBase.h"
#include "nsAutoPtr.h"
#include "FileUtils.h"
#include "nsWeakReference.h"

class nsString;

namespace mozilla {
namespace dom {

class FilesystemEntranceParams;

namespace filesystem {

class Directory;

class GetEntranceTask : public TaskBase
{
public:
  GetEntranceTask(Filesystem* aFs);
  GetEntranceTask(const FilesystemEntranceParams& aParam,
                      FilesystemRequestParent* aParent);

  virtual ~GetEntranceTask();

protected:
  virtual FilesystemParams GetRequestParams() MOZ_OVERRIDE;

  virtual FilesystemResponseValue GetSuccessRequestResult() MOZ_OVERRIDE;
  virtual void SetSuccessRequestResult(const FilesystemResponseValue& aValue) MOZ_OVERRIDE;

  virtual void Work() MOZ_OVERRIDE;
  virtual void HandlerCallback() MOZ_OVERRIDE;

private:
  static const uint32_t CREATE_DIRECTORY_PERMISSION = 0700;
  // Weak reference to Filesystem
  nsWeakPtr mFilesystem;

  already_AddRefed<Filesystem> GetFilesystem();

  nsString mTargetRealPath;
  FileInfo mTargetInfo;
};

}

}

}

#endif // mozilla_dom_getentrance_h__
