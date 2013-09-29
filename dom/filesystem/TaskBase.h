/*
 * TaskBase.h
 *
 *  Created on: Sep 29, 2013
 *      Author: yuan
 */

#ifndef mozilla_dom_taskbase_h__
#define mozilla_dom_taskbase_h__

#include "nsThreadUtils.h"
#include "mozilla/dom/filesystem/PFilesystemRequestChild.h"

namespace mozilla {
namespace dom {

class FilesystemParams;
class FilesystemResponseValue;

namespace filesystem {

class FilesystemRequestParent;

class TaskBase : public nsRunnable, PFilesystemRequestChild
{
public:
  TaskBase();
  TaskBase(FilesystemRequestParent* aParent);

  virtual ~TaskBase();

  void Start();

  virtual FilesystemParams GetRequestParams() = 0;

  virtual FilesystemResponseValue GetRequestResult() = 0;
  virtual void SetRequestResult(const FilesystemResponseValue& aValue) = 0;

  // Overrides nsIRunnable.
  NS_IMETHOD Run() MOZ_OVERRIDE;

protected:
  virtual void Work() = 0;
  virtual void HandlerCallback() = 0;

  // Overrides PFilesystemRequestChild
  virtual bool Recv__delete__(const FilesystemResponseValue& value);

  // Only used on main thread. Don't need a lock.
  nsCOMPtr<nsIThread> mWorkerThread;

  nsRefPtr<FilesystemRequestParent> mRequestParent;
private:
  void HandleResult();

  void SetError(const nsAString& aErrorName);
  void SetError(const nsresult& aErrorCode);

  // Whether current task is an IPC request running in parent.
  const bool mIsRequest;
};

}
}
}

#endif // mozilla_dom_taskbase_h__
