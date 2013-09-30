/*
 * CreateDirectoryTask.h
 *
 *  Created on: Sep 30, 2013
 *      Author: yuan
 */

#ifndef CREATEDIRECTORYTASK_H_
#define CREATEDIRECTORYTASK_H_

#include "TaskBase.h"
#include "nsAutoPtr.h"
#include "FileUtils.h"
#include "nsWeakReference.h"

class nsString;

namespace mozilla {
namespace dom {

class FilesystemCreateDirectoryParams;

namespace filesystem {

class Directory;

class CreateDirectoryTask : public TaskBase
{
public:
  CreateDirectoryTask(Directory* aDir, const nsAString& aPath);
  CreateDirectoryTask(const FilesystemCreateDirectoryParams& aParam,
                      FilesystemRequestParent* aParent);

  virtual ~CreateDirectoryTask();

protected:
  virtual FilesystemParams GetRequestParams() MOZ_OVERRIDE;

  virtual FilesystemResponseValue GetRequestResult() MOZ_OVERRIDE;
  virtual void SetRequestResult(const FilesystemResponseValue& aValue) MOZ_OVERRIDE;

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

#endif /* CREATEDIRECTORYTASK_H_ */
